/**
 * Example creations shown on the landing page. Each one opens the studio
 * with its prompt pre-filled, so every card is a one-click starting point.
 */
export type ShowcaseItem = {
  key: string;
  image: string;
  /** Looping clip; `image` doubles as its poster. */
  video: string;
  kind: 'video' | 'image';
  prompt: string;
};

export const HERO_CARDS: ShowcaseItem[] = [
  {
    key: 'cinematic',
    image: '/videos/higgsfield-reference/crowd.webp',
    video: '/videos/higgsfield-reference/crowd.mp4',
    kind: 'video',
    prompt:
      'A lone samurai in crimson armor stands on a mirror-still lake under a giant red moon, petals drifting, slow push-in, cinematic',
  },
  {
    key: 'product',
    image: '/videos/higgsfield-reference/feature-3-1.webp',
    video: '/videos/higgsfield-reference/feature-3-1.mp4',
    kind: 'video',
    prompt:
      'A rainbow glass perfume bottle standing alone on golden desert dunes at sunset, slow orbit around the bottle, luxury product commercial',
  },
  {
    key: 'shorts',
    image: '/videos/higgsfield-reference/motion.webp',
    video: '/videos/higgsfield-reference/motion.mp4',
    kind: 'video',
    prompt:
      'First-person phone footage: a hand points at a tiny frog on a mossy stone by a river, the frog jumps into the water, viral nature short',
  },
  {
    key: 'ugc',
    image: '/videos/higgsfield-reference/feature-1-2.webp',
    video: '/videos/higgsfield-reference/feature-1-2.mp4',
    kind: 'video',
    prompt:
      'Smiling young woman in a bright apartment holds an iced latte toward the camera and takes a sip, selfie-style UGC ad',
  },
  {
    key: 'story',
    image: '/videos/higgsfield-reference/dream.webp',
    video: '/videos/higgsfield-reference/dream.mp4',
    kind: 'video',
    prompt:
      'Paper lanterns float up through pink clouds above a hidden village at dusk, gentle camera rise, dreamy 3D storybook',
  },
];

export const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    key: 'glowup',
    image: '/videos/showcase/glowup.webp',
    video: '/videos/showcase/glowup.mp4',
    kind: 'video',
    prompt:
      'A girl with pink hair clips sketches at a glossy table, flips the paper toward the camera and transforms into a platinum-blonde cover star climbing out of a magazine page, glow-up transition',
  },
  {
    key: 'rink',
    image: '/videos/showcase/rink.webp',
    video: '/videos/showcase/rink.mp4',
    kind: 'video',
    prompt:
      'A girl in a pink sweatshirt and jeans glides across a glossy roller rink under string lights and disco colors, hair flying, camera rolling alongside her, retro roller disco',
  },
  {
    key: 'manhattan',
    image: '/videos/showcase/manhattan.webp',
    video: '/videos/showcase/manhattan.mp4',
    kind: 'video',
    prompt:
      'A woman in a camel trench coat drops a stack of books on a snowy Manhattan street and a stranger stops to help, romantic film scene',
  },
  {
    key: 'crew',
    image: '/videos/showcase/crew.webp',
    video: '/videos/showcase/crew.mp4',
    kind: 'video',
    prompt:
      'Five friends in retro outfits strut and dance down a sunny city sidewalk toward the camera, tracking shot, comedy music video',
  },
  {
    key: 'moonwalk',
    image: '/videos/showcase/moonwalk.webp',
    video: '/videos/showcase/moonwalk.mp4',
    kind: 'video',
    prompt:
      'A lone astronaut walks away from the camera across a mirror-still sea toward a giant cracked moon at sunset, ripples spreading, cinematic sci-fi',
  },
  {
    key: 'runway',
    image: '/videos/showcase/runway.webp',
    video: '/videos/showcase/runway.mp4',
    kind: 'video',
    prompt:
      'A blonde model throws on a striped shirt while striding down a city street toward the camera, handheld tracking shot, fashion ad',
  },
  {
    key: 'skate',
    image: '/videos/showcase/skate.webp',
    video: '/videos/showcase/skate.mp4',
    kind: 'video',
    prompt:
      'A skater in a green jacket ollies over a metal rail at golden hour, dust kicking up, low-angle slow motion with the city skyline behind, sneaker ad',
  },
  {
    key: 'groove',
    image: '/videos/showcase/groove.webp',
    video: '/videos/showcase/groove.mp4',
    kind: 'video',
    prompt:
      'A man in a red suit dances through a crowd in a moody blue hall, everyone moves around him, music video',
  },
];

export function createHref(item: Pick<ShowcaseItem, 'kind' | 'prompt'>) {
  const params = new URLSearchParams({ kind: item.kind, prompt: item.prompt });
  return `/create?${params.toString()}`;
}
