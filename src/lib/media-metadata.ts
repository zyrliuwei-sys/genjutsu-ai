import { mp4Duration } from './video-duration';

/** Decode local media before uploading; never send invalid clips to a paid API. */
export async function readMediaMetadata(
  url: string,
  kind: 'image' | 'video',
  file?: Blob
) {
  if (kind === 'image') {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      duration: 0,
    };
  }
  // Use the same movie header as the upload endpoint. Browsers can report
  // Infinity or a different track duration for otherwise valid MP4/MOV files.
  const fileDuration = file
    ? mp4Duration(new Uint8Array(await file.arrayBuffer()))
    : undefined;
  const video = document.createElement('video');
  video.preload = 'metadata';
  try {
    return await new Promise<{
      width: number;
      height: number;
      duration: number;
    }>((resolve, reject) => {
      const timer = window.setTimeout(
        () => reject(new Error('Unable to read video metadata')),
        10000
      );
      video.onloadedmetadata = () => {
        window.clearTimeout(timer);
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: fileDuration ?? video.duration,
        });
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error('Unable to read this video format'));
      };
      video.src = url;
    });
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}
