import {
  AIMediaType,
  EvolinkProvider,
  FalProvider,
  AITaskStatus as FalStatus,
} from '@/core/ai';
import { getStudioModel, STUDIO_MODELS } from '@/config/studio-models';
import { AITaskStatus, findTask, updateTask } from '@/modules/ai-tasks/service';

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
    STUDIO_MODELS.some((model) => model.id === task?.model) ||
    LEGACY_MODEL_IDS.includes(task?.model)
  );
}

export function taskView(task: any) {
  const result = parseJson<{
    video?: { url?: string };
    images?: { url?: string }[];
    error?: string;
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
    createdAt: task.createdAt,
  };
}

type Outcome =
  | { status: 'running' }
  | { status: 'success'; taskResult: any }
  | { status: 'failed'; error: string };

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
    if (!res.url) return { status: 'failed', error: 'No video returned' };
    return { status: 'success', taskResult: { video: { url: res.url } } };
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
    return { status: 'failed', error: 'Generation failed' };
  }
  if (res.taskStatus === FalStatus.SUCCESS) {
    return { status: 'success', taskResult: res.taskResult };
  }
  return { status: 'running' };
}

/** Poll the provider once and persist a terminal status. Safe to repeat. */
export async function refreshTask(task: any, configs: Record<string, string>) {
  const model = getStudioModel(task.model);
  if (!model || !task.taskId) return taskView(task);

  try {
    const outcome =
      model.provider === 'evolink'
        ? await pollEvolink(task, configs)
        : await pollFal(
            task,
            model.endpoint,
            model.kind === 'video' ? AIMediaType.VIDEO : AIMediaType.IMAGE,
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
    } else if (task.status === AITaskStatus.PENDING) {
      await updateTask({ taskId: task.id, status: AITaskStatus.PROCESSING });
    }
  } catch (error: any) {
    // Evolink: likely a transient network/API error — keep polling, but give
    // up (and refund) once the task is clearly stuck.
    const age = Date.now() - new Date(task.createdAt).getTime();
    if (model.provider === 'evolink' && !(age > STUCK_AFTER_MS)) {
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
