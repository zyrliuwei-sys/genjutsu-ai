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

/** EvoLink submission body — shared by the first submit and busy resubmits. */
export function genjutsuEvolinkRequest(params: {
  prompt: string;
  referenceVideo: string;
  leadImage: string;
  crowdImage?: string | null;
}) {
  return {
    model: GENJUTSU_EVOLINK_MODEL,
    prompt: params.prompt,
    video_urls: [params.referenceVideo],
    image_urls: params.crowdImage
      ? [params.leadImage, params.crowdImage]
      : [params.leadImage],
    // O3 edits keep the input framing (the clip is already normalized to the
    // chosen aspect), so no aspect_ratio — same body as the EvoLink
    // playground request.
    quality: GENJUTSU_EVOLINK_QUALITY,
    keep_original_sound: true,
  };
}
// EvoLink Kling O3 Video Edit 720p: $0.120/input second, rounded up, keeps
// the original sound. Verified in the model pricing panel and a playground
// A/B against O1 / O1 Fast on 2026-10-12:
// https://evolink.ai/kling-o3?model=kling-o3-video-edit#pricing
export const GENJUTSU_USD_PER_SECOND = 0.12;
// Every video is one clip of 3–10s (at most $1.20 provider cost, billed per
// input second rounded up); longer uploads are trimmed to the middle 10s.
export const GENJUTSU_SECONDS = 10;
export const GENJUTSU_MIN_SECONDS = 3;
// Container durations run a few ms long; anything past this bills an 11th second.
export const GENJUTSU_MAX_SECONDS = GENJUTSU_SECONDS + 0.05;
export const GENJUTSU_CREDITS_PER_GENERATION = 990;
export function isGenjutsuDuration(seconds: number) {
  return (
    Number.isFinite(seconds) &&
    seconds >= GENJUTSU_MIN_SECONDS &&
    seconds <= GENJUTSU_MAX_SECONDS
  );
}
export function genjutsuGenerations(seconds = GENJUTSU_SECONDS) {
  if (!isGenjutsuDuration(seconds))
    throw new Error('Reference video must be 3–10 seconds long');
  return 1;
}
export function genjutsuCredits(seconds = GENJUTSU_SECONDS) {
  return genjutsuGenerations(seconds) * GENJUTSU_CREDITS_PER_GENERATION;
}
export const GENJUTSU_CREDITS = genjutsuCredits();

/** Built-in chase scenes use prepared 10s / 1280×720 generation inputs. */
export const CRAZY_FROG_THEMES = [
  { slug: 'overpass', name: 'The overpass chase' },
  { slug: 'neon-city', name: 'Neon city getaway' },
  { slug: 'chocolate', name: 'Chocolate factory escape' },
  { slug: 'pixel-world', name: 'Pixel world pursuit' },
  { slug: 'circuit-board', name: 'Inside a circuit board' },
  { slug: 'halloween', name: 'Halloween chase' },
] as const;
const CRAZY_FROG_DIRECTION =
  'Replace only the main crouching rider with the person from the image. Preserve the invisible motorcycle illusion: no bike, wheels, seat or handlebars under the main rider. Keep the pursuer, scenery, camera movement, riding pose, jumps and escape from the supplied reference video. Do not introduce a frog character or new actions absent from the reference.';

/** Built-in goal takes use prepared 10s / 720×1280 generation inputs. */
export const OZIL_THEMES = [
  { slug: 'red-hoodie', name: 'Red hoodie finish', lead: 'red hoodie' },
  { slug: 'five-a-side', name: 'Five-a-side kit', lead: 'orange kit' },
  { slug: 'office-shirt', name: 'Office shirt goal', lead: 'light blue shirt' },
] as const;
const ozilDirection = (lead: string) =>
  `Replace only the attacking player${lead ? ` in the ${lead}` : ''} who chips the ball over the goalkeeper, stops as the defenders slide past and rolls the ball into the empty net, using the person from the image. Keep the goalkeeper, both sliding defenders, the ball path, the stadium, the crowd, the floodlights, the camera pan and the timing exactly as in the reference video. Do not add players, crests or new actions.`;

/** Built-in street freestyle takes use prepared 10s / 720×1280 generation inputs. */
export const BULIN_THEMES = [
  { slug: 'cap', name: 'Cap and pink tee', lead: 'grey cap and pink T-shirt' },
  {
    slug: 'cat',
    name: 'Cat in shades',
    lead: 'ginger cat with the gold chain',
  },
  {
    slug: 'shades',
    name: 'Pink shirt and shades',
    lead: 'woman in the pink shirt',
  },
] as const;
const bulinDirection = (lead: string) =>
  `Replace only the freestyling rapper${lead ? ` (the ${lead})` : ''} facing the camera with the person from the image, dressed in a pink short-sleeve shirt and dark sunglasses. Keep the fan holding up the portable speaker, the crowd filming on their phones, the red-lit restaurant entrance at night, the hand gestures, the bounce, the pointing at the lens, the handheld vertical camera and the timing exactly as in the reference video. Do not add people, text, logos or new actions.`;

/** Built-in shoulder-dance takes use prepared 6–10s / 720×1280 generation inputs. */
export const DAME_HOMBRO_THEMES = [
  {
    slug: 'crowd',
    name: 'Red-lit crowd',
    lead: 'man in the red T-shirt in front of the crowd',
    seconds: 10,
  },
  {
    slug: 'dog',
    name: 'Golden retriever',
    lead: 'golden retriever with the blue bandana',
    seconds: 6,
  },
  {
    slug: 'terrace',
    name: 'Sunny terrace',
    lead: 'man in the red T-shirt on the terrace',
    seconds: 6,
  },
  {
    slug: 'studio',
    name: 'Studio bounce',
    lead: 'man in the red T-shirt in the studio',
    seconds: 10,
  },
] as const;
const dameHombroDirection = (lead: string) =>
  `Replace only the dancer${lead ? ` (the ${lead})` : ''} with the person from the image, dressed in a red short-sleeve T-shirt and grey trousers. Keep the shoulder bounce, the fists and the hands pulling at the shirt, the pointing, the people around the dancer, the portable speaker if one is held up, the background, the camera and the timing exactly as in the reference video. Do not add people, text, logos or new actions.`;

/** Built-in party takes use prepared 10s / 1280×720 generation inputs. */
export const BURNING_BRIDGES_THEMES = [
  {
    slug: 'black-tee',
    name: 'Black tee and chain',
    lead: 'man in the black T-shirt and silver chain',
  },
  {
    slug: 'tracksuit',
    name: 'Blue track jacket',
    lead: 'man in the black and blue track jacket',
  },
  {
    slug: 'white-polo',
    name: 'White polo',
    lead: 'man in the white polo shirt',
  },
  {
    slug: 'teal-blazer',
    name: 'Teal blazer and shades',
    lead: 'man in the teal blazer and sunglasses',
  },
] as const;
const burningBridgesDirection = (lead: string) =>
  `Replace only the host${lead ? ` (the ${lead})` : ''} who walks up to the camera holding a silver cup with the person from the image, keeping the host's outfit. Keep the cup, the walk-up, the raised hand toward the lens, the pointing and arm moves, the friends dancing around the host, the chandeliers, the white-clothed tables, the handheld camera and the timing exactly as in the reference video. Do not add people, text, logos or new actions.`;

/** Built-in kiss takes use prepared 5s / 1280×720 generation inputs. */
export const KISS_THEMES = [
  {
    slug: 'city-lights',
    name: 'City lights kiss',
    scene: 'backlit against blurred city traffic lights at night',
  },
  {
    slug: 'night-market',
    name: 'Night market kiss',
    scene: 'holding drinks in a crowded night market',
  },
  {
    slug: 'spring-park',
    name: 'Spring park kiss',
    scene: 'standing close in a sunny green park',
  },
  {
    slug: 'hoop-earrings',
    name: 'Hoop earrings kiss',
    scene: 'leaning in by a dark green door in warm light',
  },
] as const;
const kissDirection = (scene: string) =>
  `Replace the two people who lean in and kiss${scene ? ` (${scene})` : ''} with the two people from the reference images, keeping who stands on the left and who stands on the right. Keep the slow lean-in, the closed eyes, the kiss itself, the hands, the background, the lighting, the camera framing and the timing exactly as in the reference video. Do not add people, text, logos or new actions.`;

/** Built-in stunt takes use prepared 10s / 1280×720 generation inputs. */
export const FLYING_CAR_THEMES = [
  { slug: 'ramp-flip', name: 'Ramp flip and smoke landing' },
] as const;
const FLYING_CAR_DIRECTION =
  'Replace only the silver minivan with the vehicle from the image, keeping its exact body shape, paint colour, wheels, lights and badges from every angle. Keep the curved ramp with its red edge lights, the climb until the vehicle is upside down, the launch off the top, the mid-air flip, the smoke-filled landing, the night setting, every camera angle and every cut exactly as in the reference video. Do not add people, text, logos or new actions.';

export type GenjutsuSubject = 'person' | 'vehicle' | 'couple';

/** Trusted reference context: never transform scenery when replacing a performer. */
export const GENJUTSU_REFERENCES: Record<
  string,
  { name: string; direction: string; subject?: GenjutsuSubject }
> = {
  ...Object.fromEntries(
    FLYING_CAR_THEMES.map((theme) => [
      `flying-car-${theme.slug}`,
      {
        name: theme.name,
        direction: FLYING_CAR_DIRECTION,
        subject: 'vehicle' as const,
      },
    ])
  ),
  'flying-car-ai': {
    name: 'Flying Car AI',
    direction:
      'Replace only the main vehicle with the vehicle from the image, keeping its exact body shape, paint colour, wheels and lights. Keep the stunt path, the scenery, the camera movement and every cut from the supplied reference video. Do not add people, text or new actions.',
    subject: 'vehicle',
  },
  ...Object.fromEntries(
    CRAZY_FROG_THEMES.map((theme) => [
      `crazy-frog-${theme.slug}`,
      { name: theme.name, direction: CRAZY_FROG_DIRECTION },
    ])
  ),
  ...Object.fromEntries(
    OZIL_THEMES.map((theme) => [
      `ozil-${theme.slug}`,
      { name: theme.name, direction: ozilDirection(theme.lead) },
    ])
  ),
  'ozil-ai': { name: 'Ozil AI', direction: ozilDirection('') },
  ...Object.fromEntries(
    BULIN_THEMES.map((theme) => [
      `bulin-${theme.slug}`,
      { name: theme.name, direction: bulinDirection(theme.lead) },
    ])
  ),
  'bulin-47-ai': { name: 'Bulin 47 AI', direction: bulinDirection('') },
  ...Object.fromEntries(
    DAME_HOMBRO_THEMES.map((theme) => [
      `hombro-${theme.slug}`,
      { name: theme.name, direction: dameHombroDirection(theme.lead) },
    ])
  ),
  'dame-hombro-ai': {
    name: 'Dame Hombro AI',
    direction: dameHombroDirection(''),
  },
  ...Object.fromEntries(
    BURNING_BRIDGES_THEMES.map((theme) => [
      `bridges-${theme.slug}`,
      { name: theme.name, direction: burningBridgesDirection(theme.lead) },
    ])
  ),
  'burning-bridges-ai': {
    name: 'Burning Bridges AI',
    direction: burningBridgesDirection(''),
  },
  ...Object.fromEntries(
    KISS_THEMES.map((theme) => [
      `kiss-${theme.slug}`,
      {
        name: theme.name,
        direction: kissDirection(theme.scene),
        subject: 'couple' as const,
      },
    ])
  ),
  'pollo-ai-kissing': {
    name: 'AI Kissing',
    direction: kissDirection(''),
    subject: 'couple',
  },
  'crazy-frog-ai': {
    name: 'Crazy Frog AI',
    direction:
      'Replace only the main crouching rider with the person from the image. Preserve the invisible motorcycle illusion: no bike, wheels, seat or handlebars under the main rider. Keep the pursuer, road, camera movement, riding pose, jumps and escape from the supplied reference video. Do not introduce a frog character or new actions absent from the reference.',
  },
  'moonlit-walk': {
    name: 'Moonlit Walk',
    direction:
      'Replace only the astronaut; keep the slow walk away from the camera, the ripples, the giant moon, the mirror-still sea and the static framing.',
  },
  'mural-style-shift': {
    name: 'Mural Style Shift',
    direction:
      'Replace only the dancer; keep the choreography, the painted mural, the static framing and every art-style switch on the beat.',
  },
  'chess-float': {
    name: 'Chess Float',
    direction:
      'Replace only the man in the pink suit; keep the floating pose, the beat pad, the drifting chess pieces, the meadow, the sky and the low-angle orbit.',
  },
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
  'canyon-bungee': {
    name: 'Canyon Bungee',
    direction:
      'Preserve the jump from the bridge, the fall, the rope and the camera tracking downward.',
  },
  'colonial-stroll': {
    name: 'Colonial Stroll',
    direction:
      'Replace only the man in the frock coat; keep the pine forest, the campfire logs, his walk and kneel, and the camera framing.',
  },
  'salt-flat-astronaut': {
    name: 'Salt Flat Astronaut',
    direction:
      'Replace only the woman in the white suit; keep the helmet, the salt flats, the giant planet and the static framing.',
  },
  'origami-lookbook': {
    name: 'Origami Lookbook',
    direction:
      'Replace only the front-left model; keep the other models, the origami crane, the yellow and blue walls and the camera framing.',
  },
  'tennis-ball-picnic': {
    name: 'Tennis Ball Picnic',
    direction:
      'Replace only the man in the tweed jacket; keep the woman, the picnic blanket, the falling tennis balls and the camera framing.',
  },
  'desert-boardroom': {
    name: 'Desert Boardroom',
    direction:
      'Replace only the woman in the lavender suit in the middle; keep the other two, the office chairs, the dunes and the camera framing.',
  },
  'pinstripe-portrait': {
    name: 'Pinstripe Portrait',
    direction:
      'Replace only the model; keep the pinstripe suit, the tie, the orange backdrop and the camera move.',
  },
  'corduroy-lounge': {
    name: 'Corduroy Lounge',
    direction:
      'Replace only the woman; keep the corduroy outfit, the grey studio, her seated pose and the camera framing.',
  },
  'color-block-duo': {
    name: 'Color Block Duo',
    direction:
      'Replace only the man in the navy suit; keep the woman in white, the yellow and blue walls and the camera framing.',
  },
  'pastel-picnic': {
    name: 'Pastel Picnic',
    direction:
      'Replace only the woman in the pink dress; keep the two men, the floating pastel fabrics, the hills and the camera framing.',
  },
  'cloud-lounge': {
    name: 'Cloud Lounge',
    direction:
      'Replace only the man in the lower-left cloud chair; keep the other people, the cloud armchairs, the sky and the camera drift.',
  },
  'sunlit-laundry': {
    name: 'Sunlit Laundry',
    direction:
      'Replace only the woman in the red dress; keep the laundry, the clothesline, the sunlit balcony, the plants and the static framing.',
  },
  'holiday-homecoming': {
    name: 'Holiday Homecoming',
    direction:
      'Replace only the man coming home; keep the keys, the door, the dog, the child, the woman by the Christmas tree and the edit rhythm.',
  },
  'shoreline-memory': {
    name: 'Shoreline Memory',
    direction:
      'Replace only the woman; keep the chessboard, the footprints, the aerial beach shots, the window close-up and the edit rhythm.',
  },
  'cosmic-dive': {
    name: 'Cosmic Dive',
    direction:
      'Replace only the man with the visor; keep the cockpit HUD, the flight through space, the blocky world and the dive toward the planet.',
  },
  'rail-ollie': {
    name: 'Rail Ollie',
    direction:
      'Preserve the run-up, the ollie over the rail, the landing, the dust and the low-angle slow-motion camera.',
  },
};

/** Directions describe the actual references, not the legacy card names. */
export const GENJUTSU_DIRECTIONS: Record<string, string> = {
  moonwalk:
    'Replace the astronaut using the supplied character image, seen from behind. Preserve the slow walk away from the camera across the mirror-still water, the spreading ripples and reflection, the giant cracked moon, the distant lit platform, the pastel sunset sky and the static wide framing. Photoreal scale and lighting, consistent figure, no flicker.',
  mural:
    'Replace the dancer in the red beanie using the supplied character image. Preserve the choreography and hand gestures, the giant painted mural behind him, the static framing and the beat-synced switches between anime, comic, crayon, Van Gogh brushstroke and pixel-art styles, rendering the new character in each style. Consistent identity across styles, no extra limbs or flicker.',
  chess:
    'Replace the man in the pink pinstripe suit using the supplied character image. Preserve the cross-legged floating pose, the hands playing the beat pad, the headphones, the giant chess pieces drifting and standing in the flower meadow, the blue sky with clouds and the slow low-angle orbiting camera. Golden-hour light, realistic fabric, consistent face, no flicker.',
  glowup:
    'Replace the girl using the supplied character image in both looks. Preserve the sketching at the table, the paper flip toward the camera, the transition into the magazine-cover pose climbing out of the page, and the camera framing. Photoreal skin and hair, consistent face across the transformation, no extra limbs or flicker.',
  'fire-skirt':
    'Replace the solo dancer using the supplied character image. Preserve the exact skirt spins, handstand and floor work, the glowing spark trails, the empty studio and the camera framing. Photoreal skin and fabric, consistent face, no extra limbs or flicker.',
  groove:
    'Replace the dancer in the red suit using the supplied character image. Preserve his choreography, the surrounding dancers and crowd, the moody blue hall and the camera framing. Photoreal fabric and skin, stable identity, no extra limbs or flicker.',
  runway:
    'Replace the model using the supplied character image. Preserve the walk toward the camera, the striped shirt toss, the city street and the handheld follow shot. Natural daylight, realistic fabric motion, consistent face and wardrobe.',
  bungee:
    'Replace the jumper in the teal jacket using the supplied character image. Preserve the climb over the red steel bridge railing, the jump, the fall toward the turquoise river and the downward camera tracking. Photoreal scale and motion blur, consistent identity.',
  colonial:
    'Replace the man in the dark 18th-century frock coat using the supplied character image. Preserve his walk through the pine forest clearing, the kneel, the white cravat and costume, the campfire logs and the camera framing. Natural daylight, consistent face, no flicker.',
  saltflat:
    'Replace the woman in the white spacesuit using the supplied character image. Preserve the helmet under her arm, the glowing suit details, the windblown hair, the white salt flats, the giant planet in the sky and the static framing. Photoreal skin and fabric, consistent face.',
  origami:
    'Replace the model sitting at the front left using the supplied character image. Keep the other models, the giant origami crane, the color-block outfits, the yellow and blue walls, the window-light shadows and the camera framing. Photoreal, consistent face, no extra people.',
  tennis:
    'Replace the man in the tweed jacket using the supplied character image. Keep the woman beside him, the picnic blanket, the thermos and mugs, the tennis balls falling and bouncing across the hill, and the camera framing. Overcast daylight, consistent face, no flicker.',
  desert:
    'Replace the woman in the lavender suit sitting in the middle using the supplied character image. Keep the man in mint and the woman in yellow, the office chairs and briefcases, the tire-tracked dunes, the hard sunlight and the camera framing. Consistent face, no extra people.',
  pinstripe:
    'Replace the model in the navy pinstripe suit using the supplied character image. Preserve the white shirt, the knit tie, the pocket square, the bright orange backdrop, the pose and the slow camera move. Photoreal skin and fabric, consistent face.',
  corduroy:
    'Replace the woman in the olive corduroy blazer using the supplied character image. Preserve the orange turtleneck, the color-block jacket, the seated pose against the grey wall, the minimalist studio, the soft light and the camera framing. Consistent face, no flicker.',
  colorblock:
    'Replace the man in the oversized navy suit using the supplied character image. Keep his sideways lean, the woman in the white sculptural dress, the yellow and blue walls, the sunlit floor and the camera framing. Photoreal fabric, consistent face, no extra people.',
  pastel:
    'Replace the woman in the pink dress using the supplied character image. Keep the two men waving pastel cloths, the giant floating fabrics, the sun flare, the green hills and the camera framing. Retro styling, consistent face, no flicker.',
  clouds:
    'Replace the man lounging in the lower-left cloud armchair using the supplied character image. Keep the other people in beige linen, the cloud armchairs, the hazy landscape far below and the slow aerial camera drift. Consistent face, no extra people.',
  laundry:
    'Replace the woman in the red dress using the supplied character image. Preserve her hanging white shirts on the clothesline, the wooden laundry tub, the sunlit balcony plants, the rooftops behind and the static framing. Warm golden backlight, realistic fabric motion, consistent face.',
  homecoming:
    'Replace the man in the grey coat and black scarf using the supplied character image. Preserve him unlocking the door, walking in, the dog and child greeting him, the woman by the Christmas tree and the original edit rhythm. Warm holiday lighting, consistent identity across close-ups and wide shots.',
  shoreline:
    'Replace the woman using the supplied character image. Preserve the chessboard opening, the barefoot walk leaving footprints in the sand, the aerial shoreline shots and the final close-up by the lace curtain. Soft golden light, consistent face and white dress.',
  cosmic:
    'Replace the young man putting on the glowing visor using the supplied character image. Preserve the green cockpit HUD, the jump into deep space, the flight over the blocky green world and the dive toward the planet, with the original camera motion. Consistent face, no flicker.',
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
  provider: 'evolink' | 'fal',
  subject: GenjutsuSubject = 'person'
) {
  const crowd = provider === 'fal' ? '@Image1' : 'reference image 2';
  const extra = typeof prompt === 'string' ? prompt.trim().slice(0, 500) : '';
  if (subject === 'vehicle') {
    const vehicle =
      provider === 'fal' ? '@Element1' : 'the vehicle in reference image 1';
    const base = [
      'Edit the input video, do not invent an unrelated new shot. Preserve the original background, environment, scenery, props, lighting and camera work. Do not replace or restyle the background.',
      `Replace only the main vehicle with ${vehicle}. Preserve the original driving path, stunt trajectory, rotation, timing, cuts, camera path and perspective.`,
      'Photoreal live-action footage of a rigid vehicle: consistent body shape, proportions, paint, wheels, glass and lights across frames, grounded contact with the ramp and road, coherent occlusion, smoke and reflections. No warping or melting panels, extra wheels, flicker or unrelated cuts.',
    ].join(' ');
    return extra ? `${base}\nAdditional direction: ${extra}` : base;
  }
  if (subject === 'couple') {
    // Two photos: image 1 is the person on the left, image 2 the one on the right.
    const left =
      provider === 'fal' ? '@Element1' : 'the person in reference image 1';
    const right =
      provider === 'fal' ? '@Image1' : 'the person in reference image 2';
    const swap = hasCrowd
      ? `Replace the person on the left of the frame with ${left} and the person on the right with ${right}; each keeps their own face, hair and skin tone.`
      : `Replace only the two people who kiss with the two people in ${provider === 'fal' ? '@Element1' : 'reference image 1'}, keeping each person on the same side of the frame as in the image.`;
    const base = [
      'Edit the input video, do not invent an unrelated new shot. Preserve the original background, environment, scenery, props, lighting and all bystanders. Do not replace or restyle the background.',
      `${swap} Preserve the original lean-in, kiss, hand placement, timing, cuts, camera path and perspective.`,
      'Photoreal live-action footage of two adults: consistent faces, hair and wardrobe across frames, natural head contact and occlusion, coherent lighting. No merged faces, swapped identities, extra limbs, flicker or unrelated cuts.',
    ].join(' ');
    return extra ? `${base}\nAdditional direction: ${extra}` : base;
  }
  const character =
    provider === 'fal' ? '@Element1' : 'the person in reference image 1';
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
