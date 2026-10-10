import sources from '../../public/videos/higgsfield-reference/sources.json';

/** Public reference assets, not outputs of this site's generation service. */
export const REFERENCE_VIDEOS = sources.assets.map((asset) => ({
  id: asset.id,
  video: `/videos/higgsfield-reference/${asset.id}.mp4`,
  image: `/videos/higgsfield-reference/${asset.id}.webp`,
  duration: Math.round(asset.duration),
  ratios: '16:9',
}));

export function referenceVideo(id: string) {
  const asset = REFERENCE_VIDEOS.find((item) => item.id === id);
  if (!asset) throw new Error(`Unknown reference video: ${id}`);
  return asset;
}
