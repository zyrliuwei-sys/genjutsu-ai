export const MAX_REFERENCE_VIDEO_MB = 30;
export const MAX_REFERENCE_VIDEO_BYTES = MAX_REFERENCE_VIDEO_MB * 1024 * 1024;

export function middleClipPlan(sourceSeconds: number, tier: 5 | 10) {
  if (!Number.isFinite(sourceSeconds) || sourceSeconds < 3)
    throw new Error('Video must be at least 3 seconds long');
  const duration = Math.min(sourceSeconds, tier);
  return { start: (sourceSeconds - duration) / 2, duration };
}
