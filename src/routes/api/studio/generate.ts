import { createFileRoute } from '@tanstack/react-router';

import { AIMediaType, EvolinkProvider, FalProvider } from '@/core/ai';
import { getAuth } from '@/core/auth';
import {
  promptSafetyError,
  scanPromptWithWaffo,
} from '@/core/content-safety/waffo';
import { seedanceVideoRequest } from '@/config/seedance-frames';
import {
  getStudioModel,
  IMAGE_SIZES,
  normalizeStudioOptions,
  studioCredits,
} from '@/config/studio-models';
import {
  AITaskStatus,
  createTaskOnce,
  findTask,
  setProviderTaskId,
  updateTask,
} from '@/modules/ai-tasks/service';
import { getAllConfigs } from '@/modules/config/service';
import { getBalance } from '@/modules/credits/service';
import { hasPaidOrder } from '@/modules/payment/service';
import {
  generationTaskId,
  validGenerationRequestId,
} from '@/lib/generation-request';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

import { taskView } from './-shared';

const MAX_PROMPT = 2000;

async function GET({ request }: { request: Request }) {
  try {
    const requestId = new URL(request.url).searchParams.get('requestId');
    if (requestId !== null) {
      const session = await getAuth().api.getSession({
        headers: request.headers,
      });
      if (!session?.user) return respErr('Unauthorized');
      if (!validGenerationRequestId(requestId))
        return respErr('Invalid generation request ID');
      const task = await findTask(
        await generationTaskId(session.user.id, requestId)
      );
      return respData({
        task:
          task && task.userId === session.user.id && getStudioModel(task.model)
            ? taskView(task)
            : null,
      });
    }
    const configs = await getAllConfigs();
    const safetyReady =
      configs.waffo_prompt_safety_enabled === 'false' ||
      Boolean(configs.waffo_merchant_id && configs.waffo_private_key);
    const storageReady = Boolean(
      configs.r2_access_key &&
      configs.r2_secret_key &&
      configs.r2_bucket_name &&
      (configs.r2_account_id || configs.r2_endpoint) &&
      configs.r2_domain?.startsWith('https://')
    );
    return respData({
      ready: Boolean(configs.evolink_api_key && safetyReady && storageReady),
    });
  } catch {
    return respErr('Unable to check generation configuration');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const body = await request.json();
    if (!validGenerationRequestId(body?.requestId))
      return respErr('Invalid generation request ID');
    const submissionId = await generationTaskId(
      session.user.id,
      body.requestId
    );
    const existing = await findTask(submissionId);
    if (existing) {
      if (
        existing.userId !== session.user.id ||
        !getStudioModel(existing.model)
      )
        return respErr('Invalid generation request ID');
      return respData(taskView(existing));
    }
    const limited = enforceMinIntervalRateLimit(request, {
      intervalMs: 5000,
      keyPrefix: 'studio-generate',
      extraKey: session.user.id,
    });
    if (limited) return limited;
    const model = getStudioModel(body?.model);
    if (!model) return respErr('Unsupported model');

    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return respErr('Prompt is required');
    if (prompt.length > MAX_PROMPT) return respErr('Prompt is too long');

    const options = normalizeStudioOptions(body);
    if (model.resolutions && !model.resolutions.includes(options.resolution)) {
      return respErr('Unsupported resolution');
    }

    const configs = await getAllConfigs();
    const imageUrls = body.imageUrls ?? [];
    if (!Array.isArray(imageUrls) || imageUrls.length > 2)
      return respErr('Use at most two frame images');
    if (model.id === 'seedance-2-image') {
      if (!imageUrls.length) return respErr('A first-frame image is required');
      const origin = new URL(configs.r2_domain || '').origin;
      if (
        imageUrls.some((url) => {
          try {
            const parsed = new URL(url);
            return (
              parsed.protocol !== 'https:' ||
              parsed.origin !== origin ||
              parsed.username ||
              parsed.password ||
              !/\.(jpg|jpeg|png|webp)$/i.test(parsed.pathname)
            );
          } catch {
            return true;
          }
        })
      )
        return respErr('Use frame images uploaded through this generator');
    } else if (imageUrls.length)
      return respErr('This model does not accept frame images');
    const safetyResult = await scanPromptWithWaffo(
      prompt,
      configs,
      typeof body?.locale === 'string' ? body.locale : undefined
    );
    if (safetyResult && safetyResult.action !== 'allow') {
      console.warn('[prompt-safety] Generation blocked', {
        action: safetyResult.action,
        reasonCode: safetyResult.reasonCode,
        requestId: safetyResult.requestId,
      });
      return respErr(promptSafetyError(safetyResult));
    }

    // Price is always computed server-side from the catalog.
    const price = studioCredits(model, options);
    if (
      !(await hasPaidOrder(session.user.id)) ||
      (await getBalance(session.user.id)) < price
    ) {
      return respErr('Insufficient credits');
    }

    const configured =
      model.provider === 'evolink'
        ? configs.evolink_api_key
        : configs.fal_api_key;
    if (!configured) return respErr('Generation is not configured');

    const mediaType =
      model.kind === 'video' ? AIMediaType.VIDEO : AIMediaType.IMAGE;
    const claim = await createTaskOnce({
      id: submissionId,
      userId: session.user.id,
      mediaType,
      provider: model.provider,
      model: model.id,
      prompt,
      costCredits: price,
      options: JSON.stringify({ ...options, imageUrls }),
    });
    const task = claim.task;
    if (!claim.created) return respData(taskView(task));

    try {
      let providerTaskId: string;
      if (model.provider === 'evolink') {
        const evolink = new EvolinkProvider({
          apiKey: configs.evolink_api_key,
          baseUrl: configs.evolink_base_url,
        });
        providerTaskId =
          model.kind === 'video'
            ? await evolink.createVideo(
                seedanceVideoRequest(model, prompt, options, imageUrls)
              )
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
  server: { handlers: { GET, POST } },
});
