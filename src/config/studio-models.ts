/**
 * Creation studio model catalog + credit pricing (client-safe, no server
 * imports). The generate API re-computes the price from this file, so the
 * client can only pick options — never set what it pays.
 *
 * Same rule as the duet video (./hotel-lobby-pricing.ts): every run is
 * charged at ≥ 7× its provider cost, 1 credit = $0.01, rounded up to 10
 * credits.
 *
 * Evolink Seedance 2.0 list prices (evolink.ai/seedance-2-0, 2026-10-06),
 * billed per second of output, audio included:
 *   - Standard: 480p $0.093/s · 720p $0.199/s · 1080p $0.497/s
 *   - Fast:     25% off Standard, 480p / 720p only
 * fal GPT Image 2 (high): ≤ $0.22 per image (largest canonical size).
 */

import { PRICE_MARKUP, USD_PER_CREDIT } from './hotel-lobby-pricing';

export type StudioKind = 'video' | 'image';
export type StudioProvider = 'evolink' | 'fal';

export const STUDIO_ASPECTS = ['9:16', '16:9', '1:1'] as const;
export type StudioAspect = (typeof STUDIO_ASPECTS)[number];

export const VIDEO_RESOLUTIONS = ['480p', '720p', '1080p'] as const;
export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];

export const VIDEO_DURATIONS = [5, 10, 15] as const;
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];

export type StudioModel = {
  id: string;
  kind: StudioKind;
  name: string;
  provider: StudioProvider;
  /** Provider model / endpoint id */
  endpoint: string;
  /** Video: USD per output second, by resolution. */
  usdPerSecond?: Partial<Record<VideoResolution, number>>;
  /** Image: USD per image. */
  usdPerImage?: number;
  resolutions?: readonly VideoResolution[];
};

const SEEDANCE_2_USD_PER_SECOND = {
  '480p': 0.093,
  '720p': 0.199,
  '1080p': 0.497,
};
const FAST_DISCOUNT = 0.75;

export const STUDIO_MODELS: StudioModel[] = [
  {
    id: 'seedance-2',
    kind: 'video',
    name: 'Seedance 2.0',
    provider: 'evolink',
    endpoint: 'seedance-2.0-text-to-video',
    usdPerSecond: SEEDANCE_2_USD_PER_SECOND,
    resolutions: ['480p', '720p', '1080p'],
  },
  {
    id: 'seedance-2-fast',
    kind: 'video',
    name: 'Seedance 2.0 Fast',
    provider: 'evolink',
    endpoint: 'seedance-2.0-fast-text-to-video',
    usdPerSecond: {
      '480p': SEEDANCE_2_USD_PER_SECOND['480p'] * FAST_DISCOUNT,
      '720p': SEEDANCE_2_USD_PER_SECOND['720p'] * FAST_DISCOUNT,
    },
    resolutions: ['480p', '720p'],
  },
  {
    id: 'gpt-image-2',
    kind: 'image',
    name: 'GPT Image 2',
    provider: 'fal',
    endpoint: 'openai/gpt-image-2',
    usdPerImage: 0.22,
  },
];

export function getStudioModel(id: unknown): StudioModel | undefined {
  return STUDIO_MODELS.find((model) => model.id === id);
}

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
  if (model.kind === 'image') return toCredits(model.usdPerImage ?? 0);
  const rate = model.usdPerSecond?.[options.resolution];
  if (rate === undefined) {
    throw new Error(`${model.name} does not support ${options.resolution}`);
  }
  return toCredits(rate * options.duration);
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
