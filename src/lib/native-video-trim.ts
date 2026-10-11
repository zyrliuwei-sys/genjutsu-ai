import { mp4Duration } from './video-duration';

export function supportsNativeTrim() {
  return (
    typeof MediaRecorder !== 'undefined' &&
    MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42001E') &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function'
  );
}

/** Local, real-time encoding; no WASM download or remote processing. */
export async function nativeVideoTrim(
  source: File,
  start: number,
  duration: number,
  width: number,
  height: number,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
) {
  const url = URL.createObjectURL(source);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  let stream: MediaStream | undefined;
  let recorder: MediaRecorder | undefined;
  let frame: ReturnType<typeof setInterval> | undefined;
  try {
    const bytes = await new Promise<Blob>((resolve, reject) => {
      const chunks: Blob[] = [];
      const timeout = setTimeout(
        () => fail(new Error('Local video encoding timed out')),
        30000
      );
      const cleanup = () => {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
      };
      const fail = (error: Error) => {
        cleanup();
        reject(error);
      };
      const abort = () => fail(new DOMException('Aborted', 'AbortError'));
      signal?.addEventListener('abort', abort, { once: true });
      video.onerror = () => fail(new Error('Video cannot be decoded'));
      video.onloadedmetadata = () => {
        video.currentTime = start;
      };
      video.onseeked = () => {
        video.onseeked = null;
        const draw = () => {
          const scale = Math.min(
            width / video.videoWidth,
            height / video.videoHeight
          );
          const w = video.videoWidth * scale;
          const h = video.videoHeight * scale;
          context.fillStyle = 'black';
          context.fillRect(0, 0, width, height);
          context.drawImage(video, (width - w) / 2, (height - h) / 2, w, h);
        };
        draw();
        stream = canvas.captureStream(30);
        recorder = new MediaRecorder(stream, {
          mimeType: 'video/mp4;codecs=avc1.42001E',
          videoBitsPerSecond: 4000000,
        });
        recorder.ondataavailable = (event) => {
          if (event.data.size) chunks.push(event.data);
        };
        recorder.onerror = () => fail(new Error('Local encoder failed'));
        recorder.onstop = () => {
          cleanup();
          resolve(new Blob(chunks, { type: 'video/mp4' }));
        };
        recorder.start();
        // A timer also works when the page isn't actively painting frames.
        frame = setInterval(() => {
          draw();
          onProgress?.(
            Math.min(
              99,
              Math.round(((video.currentTime - start) / duration) * 100)
            )
          );
          if (video.currentTime >= start + duration - 0.08 || video.ended) {
            clearInterval(frame);
            video.pause();
            if (recorder?.state === 'recording') recorder.stop();
          }
        }, 1000 / 30);
        void video.play().catch(fail);
      };
      signal?.throwIfAborted();
      video.src = url;
    });
    // Validate the actual container, not the requested time or wall clock.
    const actual = mp4Duration(new Uint8Array(await bytes.arrayBuffer()));
    if (actual < 3 || actual > duration)
      throw new Error('Invalid native clip duration');
    return {
      file: new File(
        [bytes],
        `${source.name.replace(/\.[^.]+$/, '')}-middle-${duration}s.mp4`,
        { type: 'video/mp4' }
      ),
      duration: actual,
      start,
    };
  } finally {
    if (frame) clearInterval(frame);
    video.pause();
    if (recorder?.state === 'recording') recorder.stop();
    stream?.getTracks().forEach((track) => track.stop());
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
