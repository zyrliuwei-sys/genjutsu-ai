import type { StudioModel, StudioOptions } from './studio-models';

/** Keep frame order: index 0 is first_frame, index 1 is last_frame. */
export function seedanceVideoRequest(
  model: StudioModel,
  prompt: string,
  options: StudioOptions,
  imageUrls: string[]
) {
  const images = model.id === 'seedance-2-image';
  if (
    images
      ? imageUrls.length < 1 || imageUrls.length > 2
      : imageUrls.length !== 0
  )
    throw new Error('Invalid frame image count');
  return {
    model: model.endpoint,
    prompt,
    duration: options.duration,
    quality: options.resolution,
    aspect_ratio: options.aspect,
    generate_audio: true,
    content_filter: true,
    ...(images ? { image_urls: imageUrls } : {}),
  };
}
