import { createFileRoute } from '@tanstack/react-router';

import { AIMediaType, EvolinkProvider, FalProvider } from '@/core/ai';
import { getAuth } from '@/core/auth';
import {
  getStudioModel,
  IMAGE_SIZES,
  normalizeStudioOptions,
  studioCredits,
} from '@/config/studio-models';
import {
  AITaskStatus,
  createTask,
  setProviderTaskId,
  updateTask,
} from '@/modules/ai-tasks/service';
import { getAllConfigs } from '@/modules/config/service';
import { getBalance } from '@/modules/credits/service';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr } from '@/lib/resp';

import { taskView } from './-shared';

const MAX_PROMPT = 2000;

async function POST({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const body = await request.json();
    const model = getStudioModel(body?.model);
    if (!model) return respErr('Unsupported model');

    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return respErr('Prompt is required');
    if (prompt.length > MAX_PROMPT) return respErr('Prompt is too long');

    const options = normalizeStudioOptions(body);
    if (model.resolutions && !model.resolutions.includes(options.resolution)) {
      return respErr('Unsupported resolution');
    }

    // Price is always computed server-side from the catalog.
    const isAdmin = await hasPermission(session.user.id, 'admin.*');
    const price = studioCredits(model, options);
    if (!isAdmin && (await getBalance(session.user.id)) < price) {
      return respErr('Insufficient credits');
    }

    const configs = await getAllConfigs();
    const configured =
      model.provider === 'evolink'
        ? configs.evolink_api_key
        : configs.fal_api_key;
    if (!configured) return respErr('Generation is not configured');

    const mediaType =
      model.kind === 'video' ? AIMediaType.VIDEO : AIMediaType.IMAGE;
    const task = await createTask({
      userId: session.user.id,
      mediaType,
      provider: model.provider,
      model: model.id,
      prompt,
      costCredits: isAdmin ? 0 : price,
      options: JSON.stringify(options),
    });

    try {
      let providerTaskId: string;
      if (model.provider === 'evolink') {
        const evolink = new EvolinkProvider({
          apiKey: configs.evolink_api_key,
          baseUrl: configs.evolink_base_url,
        });
        providerTaskId =
          model.kind === 'video'
            ? await evolink.createVideo({
                model: model.endpoint,
                prompt,
                duration: options.duration,
                quality: options.resolution,
                aspect_ratio: options.aspect,
                generate_audio: true,
                content_filter: true,
              })
            : await evolink.createImage({
                model: model.endpoint,
                prompt,
                size: options.aspect,
                quality: 'high',
                n: 1,
              });
      } else {
        const result = await new FalProvider({
          apiKey: configs.fal_api_key,
        }).generate({
          params: {
            mediaType,
            model: model.endpoint,
            prompt,
            options: {
              image_size: IMAGE_SIZES[options.aspect],
              quality: 'high',
              num_images: 1,
              output_format: 'jpeg',
            },
          },
        });
        providerTaskId = result.taskId;
      }
      await setProviderTaskId(task.id, providerTaskId);
    } catch (error: any) {
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.FAILED,
        taskResult: { error: error?.message },
      });
      throw error;
    }

    return respData(
      taskView({
        ...task,
        status: AITaskStatus.PENDING,
        options: JSON.stringify(options),
      })
    );
  } catch (error: any) {
    return respErr(error?.message || 'Generate failed');
  }
}

export const Route = createFileRoute('/api/studio/generate')({
  server: { handlers: { POST } },
});
