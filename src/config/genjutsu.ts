/**
 * Genjutsu is a motion-preserving video-to-video workflow. The endpoint is
 * intentionally kept here so the UI, task polling and generation route share
 * one model id without exposing provider credentials to the browser.
 */
import { MAX_REFERENCE_VIDEO_MB } from '@/lib/video-trim-plan';

export const GENJUTSU_MODEL_ID = 'genjutsu-storm';
export const GENJUTSU_ENDPOINT = 'fal-ai/kling-video/o1/video-to-video/edit';
export const GENJUTSU_EVOLINK_MODEL = 'kling-o3-video-edit';
export const GENJUTSU_EVOLINK_QUALITY = '720p';
// EvoLink Kling O3 Video Edit 720p: $0.120/input second, rounded up, keeps
// the original sound. Verified in the model pricing panel and a playground
// A/B against O1 / O1 Fast on 2026-10-12:
// https://evolink.ai/kling-o3?model=kling-o3-video-edit#pricing
export const GENJUTSU_USD_PER_SECOND = 0.12;
// Every video is one clip of up to 10s ($1.20 cost), sold at $9.90 of balance.
export const GENJUTSU_SECONDS = 10;
export const GENJUTSU_CREDITS_PER_GENERATION = 990;
export function genjutsuGenerations(seconds = GENJUTSU_SECONDS) {
  if (!Number.isFinite(seconds) || seconds < 3 || seconds > 10.05)
    throw new Error('Reference video must be 3–10 seconds long');
  return 1;
}
export function genjutsuCredits(seconds = GENJUTSU_SECONDS) {
  return genjutsuGenerations(seconds) * GENJUTSU_CREDITS_PER_GENERATION;
}
export const GENJUTSU_CREDITS = genjutsuCredits();

/** Trusted reference context: never transform scenery when replacing a performer. */
export const GENJUTSU_REFERENCES: Record<
  string,
  { name: string; direction: string }
> = {
  'sketch-glow-up': {
    name: 'Sketch Glow-Up',
    direction:
      'Preserve the drawing, the paper flip transition, the magazine-cover pose and the camera framing.',
  },
  'fire-skirt-spin': {
    name: 'Fire Skirt Spin',
    direction:
      'Replace only the dancer; keep the skirt spins, floor work, sparks and camera framing unchanged.',
  },
  'roller-rink': {
    name: 'Roller Rink',
    direction:
      'Replace only the skater in the pink sweatshirt; keep the other skaters, the rink lights and the camera rolling alongside her.',
  },
  'street-strut': {
    name: 'Street Strut',
    direction:
      'Replace only the front performer; keep the rest of the group, their dance steps and the tracking shot unchanged.',
  },
  'red-suit-groove': {
    name: 'Red Suit Groove',
    direction:
      'Replace only the dancer in the red suit; keep the surrounding crowd and their choreography.',
  },
  'street-runway': {
    name: 'Street Runway',
    direction:
      'Preserve the walk, the shirt toss and the handheld camera following the model.',
  },
  'manhattan-meet': {
    name: 'Manhattan Meet',
    direction:
      'Replace only the woman with the books; keep the stranger, the falling books, the snowy street and the edit rhythm.',
  },
  'canyon-bungee': {
    name: 'Canyon Bungee',
    direction:
      'Preserve the jump from the bridge, the fall, the rope and the camera tracking downward.',
  },
  'rail-ollie': {
    name: 'Rail Ollie',
    direction:
      'Preserve the run-up, the ollie over the rail, the landing, the dust and the low-angle slow-motion camera.',
  },
};

/** Directions describe the actual references, not the legacy card names. */
export const GENJUTSU_DIRECTIONS: Record<string, string> = {
  glowup:
    'Replace the girl using the supplied character image in both looks. Preserve the sketching at the table, the paper flip toward the camera, the transition into the magazine-cover pose climbing out of the page, and the camera framing. Photoreal skin and hair, consistent face across the transformation, no extra limbs or flicker.',
  'fire-skirt':
    'Replace the solo dancer using the supplied character image. Preserve the exact skirt spins, handstand and floor work, the glowing spark trails, the empty studio and the camera framing. Photoreal skin and fabric, consistent face, no extra limbs or flicker.',
  rink: 'Replace the skater in the pink sweatshirt using the supplied character image. Preserve her glide, turns and hair motion, the other skaters, the glossy rink floor, string lights and the tracking camera. Bright disco lighting, realistic skates and fabric, consistent face.',
  crew: 'Replace the lead performer at the front of the group using the supplied character image. Keep the other four performers, their synchronized strut and dance moves, the sunny sidewalk and the backward tracking shot. Natural daylight, coherent occlusions, no extra people.',
  groove:
    'Replace the dancer in the red suit using the supplied character image. Preserve his choreography, the surrounding dancers and crowd, the moody blue hall and the camera framing. Photoreal fabric and skin, stable identity, no extra limbs or flicker.',
  runway:
    'Replace the model using the supplied character image. Preserve the walk toward the camera, the striped shirt toss, the city street and the handheld follow shot. Natural daylight, realistic fabric motion, consistent face and wardrobe.',
  manhattan:
    'Replace the woman in the camel trench coat using the supplied character image. Keep the falling books, the stranger who helps, the snowy Manhattan street and the original edit rhythm. Soft winter light, consistent identity across close-ups and wide shots.',
  bungee:
    'Replace the jumper in the teal jacket using the supplied character image. Preserve the climb over the red steel bridge railing, the jump, the fall toward the turquoise river and the downward camera tracking. Photoreal scale and motion blur, consistent identity.',
  skate:
    'Replace the skater in the green jacket using the supplied character image. Preserve the push, the ollie over the metal rail, the landing, the kicked-up dust, the city skyline and the low-angle slow-motion camera. Golden-hour light, realistic board and fabric motion, consistent face.',
};

export const GENJUTSU_ASPECTS = ['16:9', '9:16'] as const;
export type GenjutsuAspect = (typeof GENJUTSU_ASPECTS)[number];

export function isGenjutsuAspect(value: unknown): value is GenjutsuAspect {
  return GENJUTSU_ASPECTS.includes(value as GenjutsuAspect);
}

export type GenjutsuReadiness = {
  provider: 'evolink' | 'fal' | null;
  model: string;
  storageReady: boolean;
  safetyReady: boolean;
  ready: boolean;
  aspects: GenjutsuAspect[];
  maxVideoMB: number;
};

export function genjutsuReadiness(
  configs: Record<string, string>
): GenjutsuReadiness {
  const provider = configs.evolink_api_key
    ? 'evolink'
    : configs.fal_api_key
      ? 'fal'
      : null;
  const storageReady = Boolean(
    configs.r2_access_key &&
    configs.r2_secret_key &&
    configs.r2_bucket_name &&
    (configs.r2_account_id || configs.r2_endpoint) &&
    configs.r2_domain?.startsWith('https://')
  );
  const safetyReady =
    configs.waffo_prompt_safety_enabled === 'false' ||
    Boolean(
      configs.waffo_merchant_id?.trim() && configs.waffo_private_key?.trim()
    );
  return {
    provider,
    model: provider === 'evolink' ? GENJUTSU_EVOLINK_MODEL : GENJUTSU_ENDPOINT,
    storageReady,
    safetyReady,
    ready: Boolean(provider && storageReady && safetyReady),
    aspects: provider === 'evolink' ? ['16:9', '9:16'] : [...GENJUTSU_ASPECTS],
    maxVideoMB: MAX_REFERENCE_VIDEO_MB,
  };
}

export function buildGenjutsuPrompt(
  prompt: unknown,
  hasCrowd: boolean,
  provider: 'evolink' | 'fal'
) {
  const character =
    provider === 'fal' ? '@Element1' : 'the person in reference image 1';
  const crowd = provider === 'fal' ? '@Image1' : 'reference image 2';
  const extra = typeof prompt === 'string' ? prompt.trim().slice(0, 500) : '';
  const base = [
    'Edit the input video, do not invent an unrelated new shot. Preserve the original background, environment, scenery, props, lighting and all non-target people. Do not replace or restyle the background.',
    `Replace only the main performer with ${character}. Preserve the original choreography, action trajectory, timing, cuts, camera path and perspective.`,
    hasCrowd
      ? `Use ${crowd} for the surrounding scene while preserving the original performance.`
      : 'Keep all non-target people, objects and background motion unchanged unless the additional direction explicitly transforms the scene.',
    'Photoreal live-action reality manipulation, grounded physical contact, consistent face and wardrobe across frames, coherent occlusion and lighting. No extra limbs, identity drift, flicker or unrelated cuts.',
  ].join(' ');
  return extra ? `${base}\nAdditional direction: ${extra}` : base;
}
