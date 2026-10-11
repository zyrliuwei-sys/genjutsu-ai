/** Normalize to model limits without stretching or cropping the subject. */
export function referenceVideoPlan(width: number, height: number) {
  if (![width, height].every((value) => Number.isFinite(value) && value > 0))
    throw new Error('Unable to read video dimensions');
  const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);
  const ratio = width / height;
  let targetWidth: number;
  let targetHeight: number;
  if (ratio > 2.5) {
    targetWidth = 2160;
    targetHeight = 864;
  } else if (ratio < 0.4) {
    targetWidth = 864;
    targetHeight = 2160;
  } else {
    const scale = Math.min(
      2160 / Math.max(width, height),
      Math.max(1, 720 / Math.min(width, height))
    );
    targetWidth = Math.min(2160, Math.max(720, even(width * scale)));
    targetHeight = Math.min(2160, Math.max(720, even(height * scale)));
  }
  const needsResize = targetWidth !== width || targetHeight !== height;
  return {
    width: targetWidth,
    height: targetHeight,
    needsResize,
    // Pad extreme shapes rather than distort their aspect ratio.
    filter: `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
  };
}
