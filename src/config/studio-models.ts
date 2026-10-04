/**
 * Creation studio model catalog + credit pricing (client-safe, no server
 * imports). The generate API re-computes the price from this file, so the
 * client can only pick options — never set what it pays.
 *
 * Same rule as the duet video (./hotel-lobby-pricing.ts): every run is
 * charged at ≥ 7× its fal cost, 1 credit = $0.01, rounded up to 10 credits.
 *
 * fal costs (fal.ai model pages, 2026-10-01):
 *   - Seedance 1.0 Lite: $1.80 / 1M video tokens  (720p 5s ≈ $0.18)
 *   - Seedance 1.0 Pro:  $2.50 / 1M video tokens  (1080p 5s ≈ $0.62)
 *     tokens = width × height × 24fps × seconds / 1024
 *   - GPT Image 2 (high): ≤ $0.22 per image (largest canonical size)
 */

import { PRICE_MARKUP, USD_PER_CREDIT } from './hotel-lobby-pricing';

export type StudioKind = 'video' | 'image';

export const STUDIO_ASPECTS = ['9:16', '16:9', '1:1'] as const;
export type StudioAspect = (typeof STUDIO_ASPECTS)[number];

export const VIDEO_RESOLUTIONS = ['720p', '1080p'] as const;
export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];

export const VIDEO_DURATIONS = [5, 10] as const;
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];

export type StudioModel = {
  id: string;
  kind: StudioKind;
  name: string;
  /** fal endpoint id */
  endpoint: string;
  /** Video: USD per 1M video tokens. Image: USD per image. */
  usdRate: number;
  resolutions?: readonly VideoResolution[];
};

export const STUDIO_MODELS: StudioModel[] = [
  {
    id: 'seedance-lite',
    kind: 'video',
    name: 'Seedance Lite',
    endpoint: 'fal-ai/bytedance/seedance/v1/lite/text-to-video',
    usdRate: 1.8,
    resolutions: ['720p', '1080p'],
  },
  {
    id: 'seedance-pro',
    kind: 'video',
    name: 'Seedance Pro',
    endpoint: 'fal-ai/bytedance/seedance/v1/pro/text-to-video',
    usdRate: 2.5,
    resolutions: ['720p', '1080p'],
  },
  {
    id: 'gpt-image-2',
    kind: 'image',
    name: 'GPT Image 2',
    endpoint: 'openai/gpt-image-2',
    usdRate: 0.22,
  },
];

export function getStudioModel(id: unknown): StudioModel | undefined {
  return STUDIO_MODELS.find((model) => model.id === id);
}

export function isStudioEndpoint(endpoint: string) {
  return STUDIO_MODELS.some((model) => model.endpoint === endpoint);
}

// Pixel area per resolution (aspect ratio barely changes the token count).
const RESOLUTION_PIXELS: Record<VideoResolution, number> = {
  '720p': 1280 * 720,
  '1080p': 1920 * 1080,
};

// gpt-image-2 output sizes: multiples of 16, ~1024² pixels so the cost
// stays within the $0.22 the price above assumes.
export const IMAGE_SIZES: Record<
  StudioAspect,
  { width: number; height: number }
> = {
  '9:16': { width: 768, height: 1360 },
  '16:9': { width: 1360, height: 768 },
  '1:1': { width: 1024, height: 1024 },
};

function toCredits(usd: number) {
  const credits = (usd * PRICE_MARKUP) / USD_PER_CREDIT;
  return Math.ceil(Number(credits.toFixed(6)) / 10) * 10;
}

export type StudioOptions = {
  aspect: StudioAspect;
  resolution: VideoResolution;
  duration: VideoDuration;
};

export function studioCredits(model: StudioModel, options: StudioOptions) {
  if (model.kind === 'image') return toCredits(model.usdRate);
  const tokens =
    (RESOLUTION_PIXELS[options.resolution] * 24 * options.duration) / 1024;
  return toCredits((tokens / 1_000_000) * model.usdRate);
}

/** Coerce untrusted input into valid options (falls back to defaults). */
export function normalizeStudioOptions(input: any): StudioOptions {
  return {
    aspect: STUDIO_ASPECTS.includes(input?.aspect) ? input.aspect : '9:16',
    resolution: VIDEO_RESOLUTIONS.includes(input?.resolution)
      ? input.resolution
      : '720p',
    duration: VIDEO_DURATIONS.includes(Number(input?.duration) as any)
      ? (Number(input.duration) as VideoDuration)
      : 5,
  };
}
