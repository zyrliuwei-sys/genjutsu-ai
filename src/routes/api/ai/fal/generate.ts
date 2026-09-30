import { createFileRoute } from '@tanstack/react-router';

import {
  AITaskStatus,
  createTask,
  setProviderTaskId,
  updateTask,
} from '@/modules/ai-tasks/service';
import { respData, respErr } from '@/lib/resp';

import {
  FAL_INPUT_FIELDS,
  FAL_MODELS,
  getFalProvider,
  requireAdmin,
} from './-shared';

async function POST({ request }: { request: Request }) {
  try {
    const guard = await requireAdmin(request);
    if (!guard.ok) return respErr(guard.error);

    const body = await request.json();
    const model: string = body?.model;
    const spec = FAL_MODELS[model];
    if (!spec) return respErr(`Unsupported model: ${model}`);

    const missing = spec.requires.filter((k) => {
      const v = body?.[k];
      return Array.isArray(v) ? v.length === 0 : !v;
    });
    if (missing.length) return respErr(`Missing: ${missing.join(', ')}`);

    const prompt: string = typeof body.prompt === 'string' ? body.prompt : '';
    const options: Record<string, unknown> = {};
    for (const key of FAL_INPUT_FIELDS) {
      if (body[key] !== undefined) options[key] = body[key];
    }

    const task = await createTask({
      userId: guard.user.id,
      mediaType: spec.mediaType,
      provider: 'fal',
      model,
      prompt,
    });

    try {
      const provider = await getFalProvider();
      const result = await provider.generate({
        params: { mediaType: spec.mediaType, model, prompt, options },
      });
      await setProviderTaskId(task.id, result.taskId);
      return respData({ id: task.id, status: AITaskStatus.PENDING });
    } catch (error: any) {
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.FAILED,
        taskResult: { error: error?.message },
      });
      throw error;
    }
  } catch (error: any) {
    return respErr(error?.message || 'Generate failed');
  }
}

export const Route = createFileRoute('/api/ai/fal/generate')({
  server: { handlers: { POST } },
});
