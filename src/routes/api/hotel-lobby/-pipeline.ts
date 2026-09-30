/**
 * Hotel Lobby duet pipeline (two fal calls chained by polling):
 *
 *   1. openai/gpt-image-2/edit  — two portraits → one orange-booth scene
 *   2. fal-ai/bytedance/dreamactor/v2 — scene + reference performance video
 *      → motion and audio transferred onto the two people
 *
 * The task row's status doubles as the stage: `pending` = scene image in
 * flight, `processing` = motion transfer in flight. Moving pending→processing
 * is claimed atomically so concurrent polls never submit step 2 twice.
 */

import { AIMediaType, FalProvider, AITaskStatus as FalStatus } from '@/core/ai';
import {
  DEFAULT_DUET_SIZE,
  DUET_SIZES,
  type DuetSize,
} from '@/config/hotel-lobby-sizes';
import {
  AITaskStatus,
  claimTaskStatus,
  findTask,
  mergeTaskInfo,
  updateTask,
} from '@/modules/ai-tasks/service';

export const IMAGE_MODEL = 'openai/gpt-image-2/edit';
export const VIDEO_MODEL = 'fal-ai/bytedance/dreamactor/v2';
export const PIPELINE_MODEL = 'hotel-lobby-duet';

export const SCENE_PROMPT = `Create a studio portrait using the two uploaded people.
Keep Subject A fixed on the left side and Subject B fixed on the right side.
They should face each other naturally, with one hanging microphone vertically centered exactly between them at face level.
{{FRAMING}}
The orange background is very important: use a bold, saturated, seamless burnt-orange studio background, clean and uniform, with no patterns, props, or visible room details.
Use soft even studio lighting and a static centered camera.
Preserve each person's identity, face, hairstyle, body proportions, and clothing.
Subject A is the person in the first uploaded image; Subject B is the person in the second uploaded image.`;

export function buildScenePrompt(
  direction?: string,
  size: DuetSize = DEFAULT_DUET_SIZE
) {
  const base = SCENE_PROMPT.replace('{{FRAMING}}', DUET_SIZES[size].framing);
  const extra = direction?.trim().slice(0, 300);
  return extra
    ? `${base}\nAdditional styling direction (never override the rules above): ${extra}`
    : base;
}

export function sceneSize(size: DuetSize = DEFAULT_DUET_SIZE) {
  const { width, height } = DUET_SIZES[size];
  return { width, height };
}

type Info = {
  imageRequestId?: string;
  videoRequestId?: string;
  sceneImageUrl?: string;
  motionVideoUrl?: string;
  error?: string;
};

function parseJson<T>(value: unknown): T {
  try {
    return value ? JSON.parse(value as string) : ({} as T);
  } catch {
    return {} as T;
  }
}

export function taskView(task: any) {
  const info = parseJson<Info>(task.taskInfo);
  const result = parseJson<{ video?: { url?: string }; error?: string }>(
    task.taskResult
  );
  return {
    id: task.id as string,
    status: task.status as AITaskStatus,
    stage:
      task.status === AITaskStatus.PENDING
        ? ('scene' as const)
        : task.status === AITaskStatus.PROCESSING
          ? ('motion' as const)
          : null,
    sceneImageUrl: info.sceneImageUrl ?? null,
    videoUrl: result.video?.url ?? null,
    error: result.error ?? info.error ?? null,
  };
}

async function fail(taskId: string, message: string) {
  await updateTask({
    taskId,
    status: AITaskStatus.FAILED,
    taskResult: { error: message },
  });
}

/**
 * Advance a pipeline task by one poll. Safe to call repeatedly/concurrently.
 */
export async function advance(taskId: string, provider: FalProvider) {
  let task = await findTask(taskId);
  if (!task) throw new Error('Task not found');
  const info = parseJson<Info>(task.taskInfo);

  try {
    // Stage 1: scene image
    if (task.status === AITaskStatus.PENDING && info.imageRequestId) {
      const res = await provider.query({
        taskId: info.imageRequestId,
        model: IMAGE_MODEL,
        mediaType: AIMediaType.IMAGE,
      });
      if (res.taskStatus === FalStatus.FAILED) {
        await fail(taskId, 'Scene image generation failed');
      } else if (res.taskStatus === FalStatus.SUCCESS) {
        const sceneImageUrl = res.taskInfo?.images?.[0]?.imageUrl;
        if (!sceneImageUrl) {
          await fail(taskId, 'Scene image generation returned no image');
        } else if (
          await claimTaskStatus(
            taskId,
            AITaskStatus.PENDING,
            AITaskStatus.PROCESSING
          )
        ) {
          await mergeTaskInfo(taskId, { sceneImageUrl });
          const video = await provider.generate({
            params: {
              mediaType: AIMediaType.VIDEO,
              model: VIDEO_MODEL,
              prompt: '',
              options: {
                image_url: sceneImageUrl,
                video_url: info.motionVideoUrl,
                trim_first_second: true,
              },
            },
          });
          await mergeTaskInfo(taskId, { videoRequestId: video.taskId });
        }
      }
    }
    // Stage 2: motion transfer (videoRequestId absent = another poll is
    // still submitting it; just report processing)
    else if (task.status === AITaskStatus.PROCESSING && info.videoRequestId) {
      const res = await provider.query({
        taskId: info.videoRequestId,
        model: VIDEO_MODEL,
        mediaType: AIMediaType.VIDEO,
      });
      if (res.taskStatus === FalStatus.FAILED) {
        await fail(taskId, 'Motion transfer failed');
      } else if (res.taskStatus === FalStatus.SUCCESS) {
        await updateTask({
          taskId,
          status: AITaskStatus.SUCCESS,
          taskResult: res.taskResult,
        });
      }
    }
  } catch (error: any) {
    // fal reports a failed run as COMPLETED + an error on the result fetch.
    await fail(taskId, error?.message || 'Generation failed');
  }

  task = await findTask(taskId);
  return taskView(task);
}
