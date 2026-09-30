import { createFileRoute } from '@tanstack/react-router';

import { AIMediaType, FalProvider } from '@/core/ai';
import { getAuth } from '@/core/auth';
import { resolveDuetCredits } from '@/config/hotel-lobby-pricing';
import {
  AITaskStatus,
  createTask,
  mergeTaskInfo,
  updateTask,
} from '@/modules/ai-tasks/service';
import { getAllConfigs } from '@/modules/config/service';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr } from '@/lib/resp';

import {
  buildScenePrompt,
  IMAGE_MODEL,
  PIPELINE_MODEL,
  SCENE_SIZE,
  taskView,
} from './-pipeline';

// Client downsizes photos before upload; this is a hard ceiling per photo.
const MAX_PHOTO_CHARS = 8 * 1024 * 1024;
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

async function POST({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const body = await request.json();
    const photos = [body?.photoA, body?.photoB];
    for (const photo of photos) {
      if (
        typeof photo !== 'string' ||
        photo.length > MAX_PHOTO_CHARS ||
        !PHOTO_RE.test(photo)
      ) {
        return respErr('Two JPG, PNG or WebP photos are required');
      }
    }
    const direction =
      typeof body?.direction === 'string' ? body.direction : undefined;

    const configs = await getAllConfigs();
    if (!configs.fal_api_key) return respErr('Generation is not configured');
    const motionVideoUrl = configs.hotel_lobby_motion_video_url;
    if (!motionVideoUrl) return respErr('Reference video is not configured');

    // Admins generate free; everyone else pays 7× the fal cost in credits.
    const isAdmin = await hasPermission(session.user.id, 'admin.*');
    const price = resolveDuetCredits(configs);

    const prompt = buildScenePrompt(direction);
    const task = await createTask({
      userId: session.user.id,
      mediaType: AIMediaType.VIDEO,
      provider: 'fal',
      model: PIPELINE_MODEL,
      prompt,
      costCredits: isAdmin ? 0 : price,
    });

    try {
      const provider = new FalProvider({ apiKey: configs.fal_api_key });
      const image = await provider.generate({
        params: {
          mediaType: AIMediaType.IMAGE,
          model: IMAGE_MODEL,
          prompt,
          options: {
            image_urls: photos,
            image_size: SCENE_SIZE,
            quality: 'high',
            output_format: 'jpeg',
          },
        },
      });
      await mergeTaskInfo(task.id, {
        imageRequestId: image.taskId,
        motionVideoUrl,
      });
    } catch (error: any) {
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.FAILED,
        taskResult: { error: error?.message },
      });
      throw error;
    }

    return respData(taskView({ ...task, status: AITaskStatus.PENDING }));
  } catch (error: any) {
    return respErr(error?.message || 'Generate failed');
  }
}

export const Route = createFileRoute('/api/hotel-lobby/generate')({
  server: { handlers: { POST } },
});
