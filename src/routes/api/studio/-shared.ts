import { AIMediaType, FalProvider, AITaskStatus as FalStatus } from '@/core/ai';
import { getStudioModel, STUDIO_MODELS } from '@/config/studio-models';
import { AITaskStatus, findTask, updateTask } from '@/modules/ai-tasks/service';

function parseJson<T>(value: unknown): T {
  try {
    return value ? JSON.parse(value as string) : ({} as T);
  } catch {
    return {} as T;
  }
}

export function isStudioTask(task: any) {
  return STUDIO_MODELS.some((model) => model.id === task?.model);
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

/** Poll fal once and persist a terminal status. Safe to call repeatedly. */
export async function refreshTask(task: any, provider: FalProvider) {
  const model = getStudioModel(task.model);
  if (!model || !task.taskId) return taskView(task);

  try {
    const res = await provider.query({
      taskId: task.taskId,
      model: model.endpoint,
      mediaType: model.kind === 'video' ? AIMediaType.VIDEO : AIMediaType.IMAGE,
    });
    if (res.taskStatus === FalStatus.FAILED) {
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.FAILED,
        taskResult: { error: 'Generation failed' },
      });
    } else if (res.taskStatus === FalStatus.SUCCESS) {
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.SUCCESS,
        taskResult: res.taskResult,
      });
    } else if (
      res.taskStatus === FalStatus.PROCESSING &&
      task.status === AITaskStatus.PENDING
    ) {
      await updateTask({ taskId: task.id, status: AITaskStatus.PROCESSING });
    }
  } catch (error: any) {
    // fal reports a failed run as COMPLETED + an error on the result fetch.
    await updateTask({
      taskId: task.id,
      status: AITaskStatus.FAILED,
      taskResult: { error: error?.message || 'Generation failed' },
    });
  }

  return taskView(await findTask(task.id));
}
