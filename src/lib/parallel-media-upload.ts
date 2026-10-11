/** Wait for both uploads to settle so a retry cannot race the remaining request. */
export async function parallelMediaUpload<Image, Video>(
  uploadImage: () => Promise<Image>,
  uploadVideo: () => Promise<Video>
): Promise<[Image, Video]> {
  const [image, video] = await Promise.allSettled([
    Promise.resolve().then(uploadImage),
    Promise.resolve().then(uploadVideo),
  ]);
  if (image.status === 'rejected') throw image.reason;
  if (video.status === 'rejected') throw video.reason;
  return [image.value, video.value];
}
