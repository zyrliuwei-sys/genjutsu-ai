import { mp4Duration } from './video-duration';
import { MAX_REFERENCE_VIDEO_BYTES, middleClipPlan } from './video-trim-plan';

export async function trimMiddleVideo(
  source: File,
  sourceSeconds: number,
  tier: 5 | 10,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
) {
  signal?.throwIfAborted();
  if (source.size > MAX_REFERENCE_VIDEO_BYTES)
    throw new Error('Video exceeds the 30MB limit');
  const plan = middleClipPlan(sourceSeconds, tier);
  if (sourceSeconds <= tier) return { file: source, ...plan };
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const ffmpeg = new FFmpeg();
  const abort = () => ffmpeg.terminate();
  signal?.addEventListener('abort', abort, { once: true });
  let wasmURL: string | undefined;
  const timeout = window.setTimeout(() => ffmpeg.terminate(), 180000);
  try {
    const parts = await Promise.all(
      [0, 1].map(async (part) => {
        const res = await fetch(`/vendor/ffmpeg/core.wasm.${part}`, {
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
            : AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error('Could not load browser video tools');
        return res.arrayBuffer();
      })
    );
    wasmURL = URL.createObjectURL(
      new Blob(parts, { type: 'application/wasm' })
    );
    await ffmpeg.load({
      coreURL: `${location.origin}/vendor/ffmpeg/ffmpeg-core.js`,
      wasmURL,
    });
    ffmpeg.on('progress', ({ progress }) =>
      onProgress?.(Math.max(0, Math.min(99, Math.round(progress * 100))))
    );
    await ffmpeg.writeFile(
      'input.mp4',
      new Uint8Array(await source.arrayBuffer())
    );
    // Re-encode rather than keyframe-copy: reference length and the selected
    // middle point must be precise. Keep source dimensions and audio.
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
    signal?.removeEventListener('abort', abort);
    window.clearTimeout(timeout);
    ffmpeg.terminate();
    if (wasmURL) URL.revokeObjectURL(wasmURL);
  }
}
