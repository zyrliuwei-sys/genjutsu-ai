import {
  AIMediaType,
  EvolinkProvider,
  FalProvider,
  AITaskStatus as FalStatus,
} from '@/core/ai';
import { GENJUTSU_ENDPOINT, GENJUTSU_MODEL_ID } from '@/config/genjutsu';
import { getStudioModel, STUDIO_MODELS } from '@/config/studio-models';
import {
  AITaskStatus,
  findTask,
  retryFailedRefund,
  updateTask,
} from '@/modules/ai-tasks/service';
import { getStorage } from '@/modules/storage/service';

// Retired fal models — still listed in history, never polled again.
const LEGACY_MODEL_IDS = ['seedance-lite', 'seedance-pro'];
const STUCK_AFTER_MS = 60 * 60 * 1000;

function parseJson<T>(value: unknown): T {
  try {
    return value ? JSON.parse(value as string) : ({} as T);
  } catch {
    return {} as T;
  }
}

export function isStudioTask(task: any) {
  return (
    task?.model === GENJUTSU_MODEL_ID ||
    STUDIO_MODELS.some((model) => model.id === task?.model) ||
    LEGACY_MODEL_IDS.includes(task?.model)
  );
}

export function taskView(task: any) {
  const result = parseJson<{
    video?: { url?: string };
    images?: { url?: string }[];
    error?: string;
    archivePending?: boolean;
  }>(task.taskResult);
  const options = parseJson<{ aspect?: string }>(task.options);
  return {
    id: task.id as string,
    status: task.status as AITaskStatus,
    kind: task.mediaType === AIMediaType.VIDEO ? 'video' : 'image',
    model: task.model as string,
    prompt: task.prompt as string,
    aspect: options.aspect ?? '9:16',
    credits: Number(task.costCredits) || 0,
    url: result.video?.url ?? result.images?.[0]?.url ?? null,
    error: result.error ?? null,
    archivePending: result.archivePending === true,
    createdAt: task.createdAt,
  };
}

type Outcome =
  | { status: 'running' }
  | { status: 'success'; taskResult: any }
  | { status: 'failed'; error: string };

/**
 * Evolink result links expire after 24 hours — copy the file into our R2
 * bucket. Falls back to the original link when storage is not configured or
 * the copy fails, so a finished result is never lost to a storage hiccup.
 */
export async function archive(url: string, key: string, contentType: string) {
  try {
    const storage = await getStorage();
    if (!storage) return url;
    const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
    if (!response.ok || !response.body)
      throw new Error('Could not retrieve generated media');
    const maxBytes = 64 * 1024 * 1024;
    if (Number(response.headers.get('content-length')) > maxBytes) {
      await response.body.cancel();
      throw new Error('Generated media exceeds archive limit');
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > maxBytes)
          throw new Error('Generated media exceeds archive limit');
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }
    const res = await storage.uploadFile({ body, key, contentType });
    if (res.success && res.url?.startsWith('https://')) return res.url;
    console.error('archive failed:', res.error ?? res.url);
  } catch (error) {
    console.error('archive failed:', error);
  }
  return url;
}

async function pollEvolink(
  task: any,
  configs: Record<string, string>
): Promise<Outcome> {
  const provider = new EvolinkProvider({
    apiKey: configs.evolink_api_key,
    baseUrl: configs.evolink_base_url,
  });
  const res = await provider.getTask(task.taskId);
  if (res.status === 'failed') {
    return { status: 'failed', error: res.error || 'Generation failed' };
  }
  if (res.status === 'completed') {
    if (!res.url) return { status: 'failed', error: 'No result returned' };
    if (task.mediaType === AIMediaType.IMAGE) {
      const url = await archive(res.url, `studio/${task.id}.png`, 'image/png');
      return {
        status: 'success',
        taskResult: { images: [{ url }], archivePending: url === res.url },
      };
    }
    const url = await archive(res.url, `studio/${task.id}.mp4`, 'video/mp4');
    return {
      status: 'success',
      taskResult: { video: { url }, archivePending: url === res.url },
    };
  }
  return { status: 'running' };
}

async function pollFal(
  task: any,
  endpoint: string,
  mediaType: AIMediaType,
  configs: Record<string, string>
): Promise<Outcome> {
  const provider = new FalProvider({ apiKey: configs.fal_api_key });
  const res = await provider.query({
    taskId: task.taskId,
    model: endpoint,
    mediaType,
  });
  if (res.taskStatus === FalStatus.FAILED) {
    return {
      status: 'failed',
      error: (res.taskResult as any)?.error || 'Generation failed',
    };
  }
  if (res.taskStatus === FalStatus.SUCCESS) {
    if (
      !(res.taskResult as any)?.video?.url &&
      !(res.taskResult as any)?.images?.[0]?.url
    ) {
      return { status: 'failed', error: 'No result returned' };
    }
    const original =
      (res.taskResult as any)?.video?.url ??
      (res.taskResult as any)?.images?.[0]?.url;
    const video = mediaType === AIMediaType.VIDEO;
    const url = await archive(
      original,
      `studio/${task.id}.${video ? 'mp4' : 'png'}`,
      video ? 'video/mp4' : 'image/png'
    );
    return {
      status: 'success',
      taskResult: {
        ...(res.taskResult as any),
        ...(video ? { video: { url } } : { images: [{ url }] }),
        archivePending: url === original,
      },
    };
  }
  return { status: 'running' };
}

/** Poll the provider once and persist a terminal status. Safe to repeat. */
export async function refreshTask(task: any, configs: Record<string, string>) {
  if (task.status === AITaskStatus.FAILED) {
    await retryFailedRefund(task.id);
    return taskView(task);
  }
  if (task.status === AITaskStatus.CANCELED) return taskView(task);
  if (task.status === AITaskStatus.SUCCESS) {
    const result = parseJson<any>(task.taskResult);
    if (result.archivePending) {
      const original = result.video?.url ?? result.images?.[0]?.url;
      if (original) {
        const video = Boolean(result.video);
        const url = await archive(
          original,
          `studio/${task.id}.${video ? 'mp4' : 'png'}`,
          video ? 'video/mp4' : 'image/png'
        );
        if (url !== original) {
          await updateTask({
            taskId: task.id,
            status: AITaskStatus.SUCCESS,
            taskResult: {
              ...result,
              archivePending: false,
              ...(video ? { video: { url } } : { images: [{ url }] }),
            },
          });
          return taskView(await findTask(task.id));
        }
      }
    }
    return taskView(task);
  }
  const model = getStudioModel(task.model);
  const provider =
    task.model === GENJUTSU_MODEL_ID
      ? {
          provider:
            task.provider === 'evolink'
              ? ('evolink' as const)
              : ('fal' as const),
          endpoint: GENJUTSU_ENDPOINT,
          kind: 'video' as const,
        }
      : model;
  if (!provider) return taskView(task);
  if (!task.taskId) {
    if (Date.now() - new Date(task.createdAt).getTime() > STUCK_AFTER_MS) {
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.FAILED,
        taskResult: { error: 'Generation submission timed out' },
      });
      return taskView(await findTask(task.id));
    }
    return taskView(task);
  }

  try {
    const outcome =
      provider.provider === 'evolink'
        ? await pollEvolink(task, configs)
        : await pollFal(
            task,
            provider.endpoint,
            provider.kind === 'video' ? AIMediaType.VIDEO : AIMediaType.IMAGE,
            configs
          );

    if (outcome.status === 'failed') {
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.FAILED,
        taskResult: { error: outcome.error },
      });
    } else if (outcome.status === 'success') {
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.SUCCESS,
        taskResult: outcome.taskResult,
      });
    } else if (
      Date.now() - new Date(task.createdAt).getTime() >
      STUCK_AFTER_MS
    ) {
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.FAILED,
        taskResult: {
          error: 'Generation timed out. Your balance will be restored.',
        },
      });
    } else if (task.status === AITaskStatus.PENDING) {
      await updateTask({ taskId: task.id, status: AITaskStatus.PROCESSING });
    }
  } catch (error: any) {
    // Evolink: likely a transient network/API error — keep polling, but give
    // up (and refund) once the task is clearly stuck.
    const age = Date.now() - new Date(task.createdAt).getTime();
    if (
      !(age > STUCK_AFTER_MS) &&
      (provider.provider === 'evolink' ||
        !/\((401|403|404)\)/.test(error?.message || ''))
    ) {
      return taskView(task);
    }
    // fal reports a failed run as COMPLETED + an error on the result fetch.
    await updateTask({
      taskId: task.id,
      status: AITaskStatus.FAILED,
      taskResult: { error: error?.message || 'Generation failed' },
    });
  }

  return taskView(await findTask(task.id));
}
