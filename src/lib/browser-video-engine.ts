import type { FFmpeg } from '@ffmpeg/ffmpeg';

let loading: Promise<FFmpeg> | undefined;
let current: FFmpeg | undefined;
let busy = false;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let inputSource: File | undefined;

function release() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = undefined;
  current?.terminate();
  current = undefined;
  loading = undefined;
  inputSource = undefined;
}

function scheduleRelease() {
  if (idleTimer) clearTimeout(idleTimer);
  // Bound memory retention on phones; never terminate an active operation.
  idleTimer = setTimeout(() => {
    if (!busy) release();
  }, 60000);
}

function loadEngine() {
  if (loading) return loading;
  loading = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const worker = new FFmpeg();
    let wasmURL: string | undefined;
    try {
      const parts = await Promise.all(
        [0, 1].map(async (part) => {
          const res = await fetch(
            `/vendor/ffmpeg/core.wasm.${part}?v=0.12.10`,
            {
              cache: 'force-cache',
              signal: AbortSignal.timeout(30000),
            }
          );
          if (!res.ok) throw new Error('Could not load browser video tools');
          return res.arrayBuffer();
        })
      );
      wasmURL = URL.createObjectURL(
        new Blob(parts, { type: 'application/wasm' })
      );
      await worker.load({
        coreURL: `${location.origin}/vendor/ffmpeg/ffmpeg-core.js?v=0.12.10`,
        wasmURL,
      });
      current = worker;
      if (!busy) scheduleRelease();
      return worker;
    } catch (error) {
      worker.terminate();
      loading = undefined;
      throw error;
    } finally {
      if (wasmURL) URL.revokeObjectURL(wasmURL);
    }
  })();
  return loading;
}

/** Start loading while the user is choosing a file, without delaying the picker. */
export function warmVideoTools() {
  if (typeof window === 'undefined') return;
  void loadEngine().catch(() => {
    /* Actual preparation reports/retries failures. */
  });
}

export async function withVideoEngine<T>(
  source: File,
  signal: AbortSignal | undefined,
  operation: (worker: FFmpeg) => Promise<T>
) {
  signal?.throwIfAborted();
  if (busy) throw new Error('Video processing is already running');
  busy = true;
  if (idleTimer) clearTimeout(idleTimer);
  let worker: FFmpeg | undefined;
  let completed = false;
  const abort = () => release();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    worker = await loadEngine();
    signal?.throwIfAborted();
    signal?.addEventListener('abort', abort, { once: true });
    timeout = setTimeout(abort, 180000);
    // Changing 5s/10s for the same source need not copy the whole file again.
    if (inputSource !== source) {
      if (inputSource) await worker.deleteFile('input.mp4');
      await worker.writeFile(
        'input.mp4',
        new Uint8Array(await source.arrayBuffer())
      );
      inputSource = source;
    }
    const result = await operation(worker);
    signal?.throwIfAborted();
    completed = true;
    return result;
  } finally {
    signal?.removeEventListener('abort', abort);
    if (timeout) clearTimeout(timeout);
    busy = false;
    if (completed && worker && current === worker) {
      try {
        await worker.deleteFile('output.mp4');
      } catch {
        /* Nothing to retain. */
      }
      scheduleRelease();
    } else release();
  }
}
