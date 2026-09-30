import { createFileRoute } from '@tanstack/react-router';

import { AITaskStatus, findTask, updateTask } from '@/modules/ai-tasks/service';
import { respData, respErr } from '@/lib/resp';

import { FAL_MODELS, getFalProvider, requireAdmin } from './-shared';

function view(task: any, result?: any) {
  return {
    id: task.id,
    model: task.model,
    status: task.status,
    images: result?.images?.map((i: any) => i.url) ?? [],
    video: result?.video?.url ?? null,
    error: result?.error ?? null,
  };
}

// Poll a fal task: returns cached result once finished, otherwise asks fal.
async function GET({ request }: { request: Request }) {
  try {
    const guard = await requireAdmin(request);
    if (!guard.ok) return respErr(guard.error);

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return respErr('id is required');

    const task = await findTask(id);
    if (!task || task.userId !== guard.user.id || task.provider !== 'fal') {
      return respErr('Task not found');
    }

    const cached = task.taskResult ? JSON.parse(task.taskResult) : undefined;
    if (
      task.status === AITaskStatus.SUCCESS ||
      task.status === AITaskStatus.FAILED ||
      !task.taskId
    ) {
      return respData(view(task, cached));
    }

    const provider = await getFalProvider();
    let result;
    try {
      result = await provider.query({
        taskId: task.taskId,
        model: task.model,
        mediaType: FAL_MODELS[task.model]?.mediaType,
      });
    } catch (error: any) {
      // fal reports a failed run as COMPLETED + an error on the result fetch.
      const taskResult = { error: error?.message || 'Generation failed' };
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.FAILED,
        taskResult,
      });
      return respData(
        view({ ...task, status: AITaskStatus.FAILED }, taskResult)
      );
    }

    const status = result.taskStatus as unknown as AITaskStatus;
    const finished =
      status === AITaskStatus.SUCCESS || status === AITaskStatus.FAILED;
    if (status !== task.status) {
      await updateTask({
        taskId: task.id,
        status,
        taskResult: finished ? result.taskResult : undefined,
      });
    }

    return respData(
      view({ ...task, status }, finished ? result.taskResult : undefined)
    );
  } catch (error: any) {
    return respErr(error?.message || 'Query failed');
  }
}

export const Route = createFileRoute('/api/ai/fal/task')({
  server: { handlers: { GET } },
});
