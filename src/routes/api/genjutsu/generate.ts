import { createFileRoute } from '@tanstack/react-router';

import { AIMediaType, EvolinkProvider, FalProvider } from '@/core/ai';
import { getAuth } from '@/core/auth';
import {
  promptSafetyError,
  scanPromptWithWaffo,
} from '@/core/content-safety/waffo';
import {
  buildGenjutsuPrompt,
  GENJUTSU_ENDPOINT,
  GENJUTSU_EVOLINK_MODEL,
  GENJUTSU_MODEL_ID,
  genjutsuCredits,
  genjutsuReadiness,
  isGenjutsuAspect,
} from '@/config/genjutsu';
import {
  AITaskStatus,
  createTaskOnce,
  findTask,
  setProviderTaskId,
  updateTask,
} from '@/modules/ai-tasks/service';
import { getAllConfigs } from '@/modules/config/service';
import { getBalance } from '@/modules/credits/service';
import { hasPermission } from '@/modules/rbac/service';
import {
  generationTaskId,
  validGenerationRequestId,
} from '@/lib/generation-request';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';
import { verifyVideoReceipt } from '@/lib/video-receipt.server';

import { taskView } from '../studio/-shared';

const MAX_PROMPT = 2000;

function isUploadedAsset(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(
        url.hostname
      )
    );
  } catch {
    return false;
  }
}

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
        task: task && task.userId === session.user.id ? taskView(task) : null,
      });
    }
    return respData(genjutsuReadiness(await getAllConfigs()));
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
    // Recover an accepted submission even if readiness/balance changed since.
    if (existing && existing.userId === session.user.id)
      return respData(taskView(existing));
    const limited = enforceMinIntervalRateLimit(request, {
      intervalMs: 5000,
      keyPrefix: 'genjutsu-generate',
      extraKey: session.user.id,
    });
    if (limited) return limited;

    const referenceVideo = body?.referenceVideo;
    const leadImage = body?.leadImage;
    const crowdImage = body?.crowdImage;
    if (!isGenjutsuAspect(body?.aspect)) return respErr('Invalid video size');
    const aspect = body.aspect;
    const configs = await getAllConfigs();
    const readiness = genjutsuReadiness(configs);
    if (!readiness.provider)
      return respErr('Configure an EvoLink or fal API key in Admin Settings');
    if (!readiness.storageReady)
      return respErr(
        'Configure public R2 storage in Admin Settings before generating'
      );
    if (!readiness.safetyReady)
      return respErr(
        'Configure prompt safety screening in Admin Settings before generating'
      );
    if (!readiness.aspects.includes(aspect))
      return respErr(
        'This video editing API does not support the selected video size'
      );
    if (readiness.provider === 'fal') {
      // fal edit preserves the source frame; do not claim an unsupported resize.
      const width = Number(body?.referenceWidth);
      const height = Number(body?.referenceHeight);
      const [w, h] = aspect.split(':').map(Number);
      if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width < 720 ||
        height < 720 ||
        Math.abs(width / height - w / h) > 0.03
      ) {
        return respErr(
          'This editing API preserves the uploaded video size; select its original ratio'
        );
      }
    }

    if (!isUploadedAsset(referenceVideo)) {
      return respErr('A public reference video is required');
    }
    if (!isUploadedAsset(leadImage)) {
      return respErr('A main character image is required');
    }
    if (
      crowdImage !== undefined &&
      crowdImage !== null &&
      !isUploadedAsset(crowdImage)
    ) {
      return respErr('The crowd image is invalid');
    }

    // Only media hosted by our configured upload domain can be submitted.
    const uploadOrigin = new URL(configs.r2_domain).origin;
    if (
      [referenceVideo, leadImage, crowdImage]
        .filter(Boolean)
        .some((url) => new URL(url).origin !== uploadOrigin)
    ) {
      return respErr('Use media uploaded through this generator');
    }
    const prompt = buildGenjutsuPrompt(
      '',
      Boolean(crowdImage),
      readiness.provider
    );
    if (prompt.length > MAX_PROMPT) return respErr('Prompt is too long');
    const duration = await verifyVideoReceipt(
      body?.videoReceipt,
      referenceVideo,
      session.user.id
    );
    const costCredits = genjutsuCredits(duration);

    const safetyResult = await scanPromptWithWaffo(
      prompt,
      configs,
      typeof body?.locale === 'string' ? body.locale : undefined
    );
    if (safetyResult && safetyResult.action !== 'allow') {
      console.warn('[prompt-safety] Genjutsu generation blocked', {
        action: safetyResult.action,
        reasonCode: safetyResult.reasonCode,
        requestId: safetyResult.requestId,
      });
      return respErr(promptSafetyError(safetyResult));
    }

    const isAdmin = await hasPermission(session.user.id, 'admin.*');
    if (!isAdmin && (await getBalance(session.user.id)) < costCredits) {
      return respErr('Insufficient credits');
    }

    const claim = await createTaskOnce({
      id: submissionId,
      userId: session.user.id,
      mediaType: AIMediaType.VIDEO,
      provider: readiness.provider,
      model: GENJUTSU_MODEL_ID,
      prompt,
      costCredits: isAdmin ? 0 : costCredits,
      options: {
        duration,
        aspect,
        referenceVideo,
        leadImage,
        crowdImage: crowdImage || null,
      },
    });
    const task = claim.task;
    if (!claim.created) return respData(taskView(task));

    try {
      if (readiness.provider === 'evolink') {
        const provider = new EvolinkProvider({
          apiKey: configs.evolink_api_key,
          baseUrl: configs.evolink_base_url,
        });
        const id = await provider.createVideo({
          model: GENJUTSU_EVOLINK_MODEL,
          prompt,
          video_urls: [referenceVideo],
          image_urls: crowdImage ? [leadImage, crowdImage] : [leadImage],
          keep_original_sound: true,
          aspect_ratio: aspect,
        });
        await setProviderTaskId(task.id, id);
      } else {
        const imageRefs = crowdImage ? [crowdImage] : [];
        const provider = new FalProvider({ apiKey: configs.fal_api_key });
        const result = await provider.generate({
          params: {
            mediaType: AIMediaType.VIDEO,
            model: GENJUTSU_ENDPOINT,
            prompt,
            options: {
              video_url: referenceVideo,
              elements: [
                {
                  frontal_image_url: leadImage,
                  reference_image_urls: [leadImage],
                },
              ],
              image_urls: imageRefs,
              keep_audio: true,
            },
          },
        });
        await setProviderTaskId(task.id, result.taskId);
      }
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
        options: JSON.stringify({
          aspect,
          referenceVideo,
          leadImage,
          crowdImage: crowdImage || null,
        }),
      })
    );
  } catch (error: any) {
    return respErr(error?.message || 'Generate failed');
  }
}

export const Route = createFileRoute('/api/genjutsu/generate')({
  server: { handlers: { GET, POST } },
});
