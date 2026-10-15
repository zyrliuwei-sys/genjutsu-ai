/**
 * Example creations shown on the landing page. Each one opens the studio
 * on the matching effect, so every card is a one-click starting point.
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
    key: 'moonwalk',
    image: '/videos/showcase/moonwalk.webp',
    video: '/videos/showcase/moonwalk.mp4',
    kind: 'video',
    prompt:
      'A lone astronaut walks away from the camera across a mirror-still sea toward a giant cracked moon at sunset, ripples spreading, cinematic sci-fi',
  },
  {
    key: 'chess',
    image: '/videos/showcase/chess.webp',
    video: '/videos/showcase/chess.mp4',
    kind: 'video',
    prompt:
      'A man in a pink pinstripe suit and headphones floats cross-legged above a flower meadow playing a beat pad, giant chess pieces drifting through a blue sky, low-angle orbit, surreal fashion film',
  },
  {
    key: 'mural',
    image: '/videos/showcase/mural.webp',
    video: '/videos/showcase/mural.mp4',
    kind: 'video',
    prompt:
      'A young man in a red beanie, glasses and an olive jacket dances in front of a giant painted mural, the art style flips every beat from anime to comic, crayon, Van Gogh and pixel art',
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
  {
    key: 'homecoming',
    image: '/videos/showcase/homecoming.webp',
    video: '/videos/showcase/homecoming.mp4',
    kind: 'video',
    prompt:
      'A man in a grey coat unlocks his apartment door, his dog and daughter rush to greet him, a woman smiles by the Christmas tree, warm holiday film',
  },
  {
    key: 'shoreline',
    image: '/videos/showcase/shoreline.webp',
    video: '/videos/showcase/shoreline.mp4',
    kind: 'video',
    prompt:
      'A barefoot woman in a white dress leaves footprints along a golden beach, aerial shots of turquoise waves, ending on a close-up by a lace curtain, art film',
  },
  {
    key: 'cosmic',
    image: '/videos/showcase/cosmic.webp',
    video: '/videos/showcase/cosmic.mp4',
    kind: 'video',
    prompt:
      'A young man puts on a glowing VR visor and launches through deep space, over a blocky green world, then dives toward a planet at high speed, sci-fi journey',
  },
  {
    key: 'colonial',
    image: '/videos/showcase/colonial.webp',
    video: '/videos/showcase/colonial.mp4',
    kind: 'video',
    prompt:
      'A man in an 18th-century dark frock coat and white cravat walks through a pine forest clearing toward the camera and kneels, period drama',
  },
  {
    key: 'saltflat',
    image: '/videos/showcase/saltflat.webp',
    video: '/videos/showcase/saltflat.mp4',
    kind: 'video',
    prompt:
      'A blonde woman in a white sleeveless spacesuit holds a helmet under her arm on white salt flats, a giant planet hangs in the blue sky, hair blowing, sci-fi fashion',
  },
  {
    key: 'origami',
    image: '/videos/showcase/origami.webp',
    video: '/videos/showcase/origami.mp4',
    kind: 'video',
    prompt:
      'Models in color-block tailoring pose in front of yellow and blue walls around a giant paper origami crane, editorial fashion film',
  },
  {
    key: 'tennis',
    image: '/videos/showcase/tennis.webp',
    video: '/videos/showcase/tennis.mp4',
    kind: 'video',
    prompt:
      'A couple in tweed and knitwear sit on a picnic blanket on a grassy hill as hundreds of tennis balls rain down around them, surreal fashion film',
  },
  {
    key: 'desert',
    image: '/videos/showcase/desert.webp',
    video: '/videos/showcase/desert.mp4',
    kind: 'video',
    prompt:
      'Three people in pastel suits sit on office chairs in the middle of tire-tracked desert dunes under a clear blue sky, editorial fashion film',
  },
  {
    key: 'pinstripe',
    image: '/videos/showcase/pinstripe.webp',
    video: '/videos/showcase/pinstripe.mp4',
    kind: 'video',
    prompt:
      'A model in a navy pinstripe suit, white shirt and knit tie poses against a bright orange studio backdrop, slow push-in, tailoring ad',
  },
  {
    key: 'corduroy',
    image: '/videos/showcase/corduroy.webp',
    video: '/videos/showcase/corduroy.mp4',
    kind: 'video',
    prompt:
      'A woman in an olive corduroy blazer and orange turtleneck sits on the floor leaning against a grey wall in a minimalist studio, soft light, fashion editorial',
  },
  {
    key: 'colorblock',
    image: '/videos/showcase/colorblock.webp',
    video: '/videos/showcase/colorblock.mp4',
    kind: 'video',
    prompt:
      'A man in an oversized navy suit leans sideways against a woman in a white sculptural dress in front of yellow and blue walls, playful fashion film',
  },
  {
    key: 'pastel',
    image: '/videos/showcase/pastel.webp',
    video: '/videos/showcase/pastel.mp4',
    kind: 'video',
    prompt:
      'A woman in a pink 1950s dress cuts cake on a sunny hillside while two men wave pastel silk cloths and giant fabrics float overhead, dreamy retro picnic',
  },
  {
    key: 'clouds',
    image: '/videos/showcase/clouds.webp',
    video: '/videos/showcase/clouds.mp4',
    kind: 'video',
    prompt:
      'People in beige linen lounge on armchairs made of clouds high above the earth, chatting and reading, slow aerial drift, dreamy surreal ad',
  },
];

/** Showcase keys are effect asset ids: open the studio on that effect. */
export function createHref(item: Pick<ShowcaseItem, 'key'>) {
  return `/create?effect=${encodeURIComponent(item.key)}`;
}
