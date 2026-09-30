/**
 * Hotel Lobby duet credit pricing (client-safe, no server imports).
 *
 * 1 credit is sold at $0.01, and each video is charged at 7× its fal cost:
 *   fal cost = GPT Image 2 edit scene (720×1280, high ≈ $0.18 + input image
 *              tokens → budgeted $0.20) + DreamActor v2 at $0.05 / second
 *              of the reference video.
 * Source: fal.ai model pages (checked 2026-09-30).
 */

export const FAL_SCENE_IMAGE_USD = 0.2;
export const FAL_MOTION_USD_PER_SECOND = 0.05;
export const PRICE_MARKUP = 7;
export const USD_PER_CREDIT = 0.01;

// DreamActor caps reference videos at 30s; assume the max when unknown so
// a video is never sold below 7× cost.
export const DEFAULT_REFERENCE_SECONDS = 30;

export function falCostUsd(referenceSeconds: number) {
  return FAL_SCENE_IMAGE_USD + FAL_MOTION_USD_PER_SECOND * referenceSeconds;
}

export function duetCredits(referenceSeconds = DEFAULT_REFERENCE_SECONDS) {
  const seconds = Math.min(Math.max(referenceSeconds, 1), 30);
  return Math.ceil((falCostUsd(seconds) * PRICE_MARKUP) / USD_PER_CREDIT);
}

/**
 * Credits charged per video. An explicit admin override wins; otherwise the
 * price follows the configured reference video length.
 */
export function resolveDuetCredits(configs: Record<string, string>) {
  const override = Number(configs.hotel_lobby_credits);
  if (Number.isFinite(override) && override > 0) return Math.ceil(override);
  const seconds = Number(configs.hotel_lobby_video_seconds);
  return duetCredits(
    Number.isFinite(seconds) && seconds > 0
      ? seconds
      : DEFAULT_REFERENCE_SECONDS
  );
}
