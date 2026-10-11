import { withVideoEngine } from './browser-video-engine';
import { nativeVideoTrim, supportsNativeTrim } from './native-video-trim';
import { referenceVideoPlan } from './reference-video-plan';
import { mp4Duration } from './video-duration';
import { MAX_REFERENCE_VIDEO_BYTES, middleClipPlan } from './video-trim-plan';

export async function trimMiddleVideo(
  source: File,
  sourceSeconds: number,
  tier: 5 | 10,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
  dimensions?: { width: number; height: number }
) {
  signal?.throwIfAborted();
  if (source.size > MAX_REFERENCE_VIDEO_BYTES)
    throw new Error('Video exceeds the 30MB limit');
  const plan = middleClipPlan(sourceSeconds, tier);
  const resize = dimensions
    ? referenceVideoPlan(dimensions.width, dimensions.height)
    : undefined;
  if (sourceSeconds <= tier && !resize?.needsResize)
    return { file: source, ...plan };
  if (supportsNativeTrim() && dimensions) {
    try {
      const result = await nativeVideoTrim(
        source,
        plan.start,
        plan.duration,
        resize?.width ?? dimensions.width,
        resize?.height ?? dimensions.height,
        onProgress,
        signal
      );
      if (result.file.size > MAX_REFERENCE_VIDEO_BYTES)
        throw new Error('Trimmed video exceeds the 30MB limit');
      onProgress?.(100);
      return result;
    } catch (error) {
      signal?.throwIfAborted();
      console.warn(
        'Native video preparation failed; trying WASM encoder',
        error
      );
    }
  }
  return withVideoEngine(source, signal, async (ffmpeg) => {
    const progressHandler = ({ progress }: { progress: number }) =>
      onProgress?.(Math.max(0, Math.min(99, Math.round(progress * 100))));
    ffmpeg.on('progress', progressHandler);
    try {
      // Re-encode rather than keyframe-copy: reference length and the selected
      // middle point must be precise. Normalize dimensions when needed; keep audio.
      const code = await ffmpeg.exec(
        [
          '-ss',
          String(plan.start),
          '-i',
          'input.mp4',
          '-t',
          String(plan.duration),
          '-map',
          '0:v:0',
          '-map',
          '0:a:0?',
          ...(resize?.needsResize ? ['-vf', resize.filter] : []),
          '-c:v',
          'libx264',
          '-preset',
          'ultrafast',
          '-crf',
          '23',
          '-pix_fmt',
          'yuv420p',
          '-r',
          '30',
          '-c:a',
          'aac',
          '-movflags',
          '+faststart',
          'output.mp4',
        ],
        120000
      );
      if (code !== 0) throw new Error('Browser video trimming failed');
      const bytes = await ffmpeg.readFile('output.mp4');
      if (typeof bytes === 'string') throw new Error('Invalid trimmed video');
      const duration = mp4Duration(bytes);
      // Never round a longer output down for billing or submit unbounded clips.
      if (duration < 3 || duration > tier)
        throw new Error('Trimmed video duration does not match the selection');
      const file = new File(
        [Uint8Array.from(bytes)],
        `${source.name.replace(/\.[^.]+$/, '')}-middle-${tier}s.mp4`,
        { type: 'video/mp4' }
      );
      if (file.size > MAX_REFERENCE_VIDEO_BYTES)
        throw new Error('Trimmed video exceeds the 30MB limit');
      onProgress?.(100);
      return { file, start: plan.start, duration };
    } finally {
      ffmpeg.off('progress', progressHandler);
    }
  });
}
