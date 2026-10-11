/**
 * Grab a single JPEG frame from a (same-origin or blob:) video URL in the
 * browser. Used as the scene reference for the free still preview.
 */
export async function captureVideoFrame(
  src: string,
  { maxSide = 1280, at }: { maxSide?: number; at?: number } = {}
): Promise<File> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  video.src = src;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Could not read the video'));
    });
    const time = at ?? Math.min(1, (video.duration || 0) / 2);
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error('Could not read the video'));
      video.currentTime = time;
    });
    const scale = Math.min(
      1,
      maxSide / Math.max(video.videoWidth, video.videoHeight)
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas
      .getContext('2d')!
      .drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    );
    if (!blob) throw new Error('Could not read the video');
    return new File([blob], 'reference-frame.jpg', { type: 'image/jpeg' });
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}
