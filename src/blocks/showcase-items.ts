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
    key: 'unboxing',
    image: '/videos/higgsfield-reference/feature-3-2.webp',
    video: '/videos/higgsfield-reference/feature-3-2.mp4',
    kind: 'video',
    prompt:
      'A black sneaker bursts out of a flash of white light against a dark backdrop, slow-motion product reveal',
  },
  {
    key: 'cyber',
    image: '/videos/higgsfield-reference/feature-1-1.webp',
    video: '/videos/higgsfield-reference/feature-1-1.mp4',
    kind: 'video',
    prompt:
      'A cyber ninja on a neon rooftop in the rain draws a glowing blade, the camera circles around, cinematic sci-fi',
  },
  {
    key: 'food',
    image: '/videos/higgsfield-reference/feature-2-1.webp',
    video: '/videos/higgsfield-reference/feature-2-1.mp4',
    kind: 'video',
    prompt:
      'Slow motion chocolate sauce pours over a tall stack of pancakes with fresh berries, macro food commercial',
  },
  {
    key: 'travel',
    image: '/videos/higgsfield-reference/feature-2-3.webp',
    video: '/videos/higgsfield-reference/feature-2-3.mp4',
    kind: 'video',
    prompt:
      'Drone fly-through over a turquoise lagoon and white cliffs at golden hour, smooth travel vlog shot',
  },
  {
    key: 'talking',
    image: '/videos/higgsfield-reference/crowd.webp',
    video: '/videos/higgsfield-reference/crowd.mp4',
    kind: 'video',
    prompt:
      'A friendly young creator talks to the camera in a home studio with a ring light and plants, vertical talking-head video',
  },
  {
    key: 'fashion',
    image: '/videos/higgsfield-reference/motion.webp',
    video: '/videos/higgsfield-reference/motion.mp4',
    kind: 'video',
    prompt:
      'A model in a flowing yellow dress walks through desert dunes at sunset, the fabric catches the wind, fashion ad',
  },
  {
    key: 'space',
    image: '/videos/higgsfield-reference/launch.webp',
    video: '/videos/higgsfield-reference/launch.mp4',
    kind: 'video',
    prompt:
      'An astronaut floats slowly toward a giant glowing ringed planet, stars drift past, cinematic space scene',
  },
  {
    key: 'skincare',
    image: '/videos/higgsfield-reference/feature-3-1.webp',
    video: '/videos/higgsfield-reference/feature-3-1.mp4',
    kind: 'video',
    prompt:
      'A blue lotus slowly blooms inside a tall glass vial on wet stone, gentle camera push-in, soft studio light, premium skincare video',
  },
];

export function createHref(item: Pick<ShowcaseItem, 'kind' | 'prompt'>) {
  const params = new URLSearchParams({ kind: item.kind, prompt: item.prompt });
  return `/create?${params.toString()}`;
}
