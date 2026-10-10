/** Decode local media before uploading; never send invalid clips to a paid API. */
export async function readMediaMetadata(url: string, kind: 'image' | 'video') {
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
          duration: video.duration,
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
