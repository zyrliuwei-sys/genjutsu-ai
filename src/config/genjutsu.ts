/**
 * Genjutsu is a motion-preserving video-to-video workflow. The endpoint is
 * intentionally kept here so the UI, task polling and generation route share
 * one model id without exposing provider credentials to the browser.
 */
export const GENJUTSU_MODEL_ID = 'genjutsu-storm';
export const GENJUTSU_ENDPOINT = 'fal-ai/kling-video/o1/video-to-video/edit';
export const GENJUTSU_EVOLINK_MODEL = 'kling-o1-video-edit';
// EvoLink Kling O1 Video Edit: $0.177/input second, billed 3–10s.
// Verified in the hydrated model-specific pricing panel on 2026-10-10:
// https://evolink.ai/kling-o1?model=kling-o1-video-edit#pricing
export const GENJUTSU_USD_PER_SECOND = 0.177;
export const GENJUTSU_CREDITS_PER_GENERATION = 620;
export function genjutsuGenerations(seconds = 5) {
  if (!Number.isFinite(seconds) || seconds < 3 || seconds > 10.05)
    throw new Error('Reference video must be 3–10 seconds long');
  return seconds <= 5 ? 1 : 2;
}
export function genjutsuCredits(seconds = 5) {
  return genjutsuGenerations(seconds) * GENJUTSU_CREDITS_PER_GENERATION;
}
export const GENJUTSU_CREDITS = genjutsuCredits(5);

/** Directions describe the actual references, not the legacy card names. */
export const GENJUTSU_DIRECTIONS: Record<string, string> = {
  crowd:
    'A live-action ensemble performance: the lead remains visually distinct at the center while the surrounding performers keep the original synchronized choreography. Preserve crowd count, spacing, body contacts and occlusions. Contemporary wardrobe, muted cinematic grade, no generic beauty montage.',
  dream:
    'Preserve the continuous running, jumping and landing performance and matching camera motion. Transform the environment into a photoreal surreal rooftop world with impossible doorways and suspended everyday objects. Ground every landing and retain momentum; no unrelated pastel flower reveal.',
  motion:
    'Recast the original two-person martial-arts performance with the supplied lead identity. Keep punches, blocks, footwork, contacts and camera movement aligned to the input. Photoreal dojo, plausible anatomy and spatial continuity.',
  launch:
    'Recast the main performer while retaining the source action and edit rhythm. Create physically grounded, photoreal changes of surroundings with continuous subject identity. Do not invent extra cuts or change the choreography.',
  'feature-1-2':
    'Replace the main performer using the supplied character image. Preserve the exact source motion, camera framing and interaction with the surroundings. Realistic live-action textures, consistent face and wardrobe, no animation aesthetic.',
  'feature-1-1':
    'Preserve the source fight choreography, partner interaction and camera movement. Recast the lead using the supplied reference while keeping spatial relationships, impacts and occlusions coherent. Cinematic photoreal action, not a standalone portrait animation.',
  'feature-2-1':
    'Preserve the original performer action, movement trajectory and camera timing. Restage the shot on a cinematic rooftop with grounded feet and realistic perspective. Keep character identity consistent with the uploaded image.',
  'feature-2-3':
    'Keep the original choreography and camera path while restaging the performance in a photoreal outdoor park. Match contact shadows, scale and natural light; preserve the lead identity throughout.',
  'feature-3-1':
    'Perform a targeted photoreal reality edit while preserving the source take, timing and camera movement. Replace the main subject using the supplied image; retain non-target objects, people and their motion.',
  'feature-3-2':
    'Recast the main subject with the supplied image while maintaining the source shot and action beat for beat. Keep the surrounding composition and physical interactions stable; use coherent live-action lighting and clean temporal edges.',
};

export const GENJUTSU_ASPECTS = ['16:9', '4:3', '9:16'] as const;
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
    maxVideoMB: provider === 'evolink' ? 100 : 200,
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
    'Edit the input video, do not invent an unrelated new shot.',
    `Replace only the main performer with ${character}. Preserve the original choreography, action trajectory, timing, cuts, camera path and perspective.`,
    hasCrowd
      ? `Use ${crowd} for the surrounding scene while preserving the original performance.`
      : 'Keep all non-target people, objects and background motion unchanged unless the additional direction explicitly transforms the scene.',
    'Photoreal live-action reality manipulation, grounded physical contact, consistent face and wardrobe across frames, coherent occlusion and lighting. No extra limbs, identity drift, flicker or unrelated cuts.',
  ].join(' ');
  return extra ? `${base}\nAdditional direction: ${extra}` : base;
}
