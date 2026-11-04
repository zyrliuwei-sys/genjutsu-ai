/** Public trend destinations shared by the homepage and discovery links. */
export const TREND_PAGES = [
  {
    slug: 'dime-dime-baby-ai',
    key: 'dime',
    image: '/videos/dime-dime-baby/black-shirt.jpg',
  },
  { slug: 'ozil-ai', key: 'ozil', image: '/videos/ozil/red-hoodie.jpg' },
  { slug: 'flying-car-ai', key: 'flycar', image: '/videos/flying-car/car.jpg' },
  {
    slug: 'crazy-frog-ai',
    key: 'frog',
    image: '/videos/crazy-frog/neon-city.jpg',
  },
  { slug: 'bulin-47-ai', key: 'bulin', image: '/videos/bulin/cap.jpg' },
  {
    slug: 'pollo-ai-kissing',
    key: 'kiss',
    image: '/videos/pollo-kissing/spring-park.jpg',
  },
  {
    slug: 'burning-bridges-ai',
    key: 'bridges',
    image: '/videos/burning-bridges/black-tee.jpg',
  },
  {
    slug: 'dame-hombro-ai',
    key: 'hombro',
    image: '/videos/dame-hombro/crowd.jpg',
  },
  {
    slug: 'tiny-desk-ai',
    key: 'tinydesk',
    image: '/videos/tiny-desk/laugh.jpg',
  },
] as const;

export type TrendSlug = (typeof TREND_PAGES)[number]['slug'];

/** Hand-picked adjacent music, reaction and photo-to-scene workflows. */
export const RELATED_TRENDS: Record<TrendSlug, readonly TrendSlug[]> = {
  'dime-dime-baby-ai': [
    'bulin-47-ai',
    'dame-hombro-ai',
    'ozil-ai',
    'burning-bridges-ai',
  ],
  'ozil-ai': [
    'dime-dime-baby-ai',
    'crazy-frog-ai',
    'dame-hombro-ai',
    'tiny-desk-ai',
  ],
  'flying-car-ai': [
    'crazy-frog-ai',
    'ozil-ai',
    'pollo-ai-kissing',
    'tiny-desk-ai',
  ],
  'crazy-frog-ai': [
    'flying-car-ai',
    'ozil-ai',
    'dime-dime-baby-ai',
    'bulin-47-ai',
  ],
  'bulin-47-ai': [
    'dime-dime-baby-ai',
    'dame-hombro-ai',
    'burning-bridges-ai',
    'crazy-frog-ai',
  ],
  'pollo-ai-kissing': [
    'tiny-desk-ai',
    'burning-bridges-ai',
    'flying-car-ai',
    'dame-hombro-ai',
  ],
  'burning-bridges-ai': [
    'dime-dime-baby-ai',
    'bulin-47-ai',
    'pollo-ai-kissing',
    'tiny-desk-ai',
  ],
  'dame-hombro-ai': [
    'dime-dime-baby-ai',
    'bulin-47-ai',
    'ozil-ai',
    'pollo-ai-kissing',
  ],
  'tiny-desk-ai': [
    'burning-bridges-ai',
    'pollo-ai-kissing',
    'flying-car-ai',
    'crazy-frog-ai',
  ],
};
