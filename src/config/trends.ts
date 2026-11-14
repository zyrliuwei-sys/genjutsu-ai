import { katanaExamples } from '@/content/katana';

export const TREND_HUB_PATH = '/genjutsu-trends';
export const FLOOR_GUIDE_PATH = '/guides/58th-floor';
export const SHERU_GUIDE_PATH = '/guides/who-started-sheru-bhai-trend';
export const SHERU_PAGE_PATH = '/sheru-bhai-ai';
export const FLOOR_PAGE_PATH = '/58th-floor-ai';
export const TREND_HUB_URL = 'https://genjutsu-ai.org/genjutsu-trends';
export const TREND_HUB_LABEL = 'All trending AI video memes';
export const TREND_HUB_PARENT = {
  label: TREND_HUB_LABEL,
  href: TREND_HUB_PATH,
};

export function trendBreadcrumbSchema(
  name: string,
  url: string,
  homeUrl: string
) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: homeUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: TREND_HUB_LABEL,
        item: TREND_HUB_URL,
      },
      { '@type': 'ListItem', position: 3, name, item: url },
    ],
  };
}

/** Public trend destinations shared by the homepage and discovery links. */
export const TREND_PAGES = [
  {
    slug: '58th-floor-ai',
    key: 'floor',
    image: '/videos/58th-floor/handoff.jpg',
  },
  {
    slug: 'hit-the-road-dude-ai',
    key: 'road',
    image: '/videos/hit-the-road-dude/dog.jpg',
  },
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
  {
    slug: 'sheru-bhai-ai',
    key: 'sheru',
    image: '/videos/sheru/palace.jpg',
  },
  {
    slug: 'higgsfield-katana',
    key: 'katana',
    image: katanaExamples[0].poster,
  },
] as const;

export type TrendSlug = (typeof TREND_PAGES)[number]['slug'];

/** Hand-picked adjacent music, reaction and photo-to-scene workflows. */
export const RELATED_TRENDS: Record<TrendSlug, readonly TrendSlug[]> = {
  'higgsfield-katana': [
    '58th-floor-ai',
    'tiny-desk-ai',
    'dime-dime-baby-ai',
    'sheru-bhai-ai',
  ],
  'sheru-bhai-ai': [
    'higgsfield-katana',
    'hit-the-road-dude-ai',
    'crazy-frog-ai',
    'flying-car-ai',
    'dime-dime-baby-ai',
  ],
  '58th-floor-ai': [
    'higgsfield-katana',
    'tiny-desk-ai',
    'bulin-47-ai',
    'burning-bridges-ai',
    'pollo-ai-kissing',
  ],
  'hit-the-road-dude-ai': [
    'sheru-bhai-ai',
    'dime-dime-baby-ai',
    'crazy-frog-ai',
    'dame-hombro-ai',
    'flying-car-ai',
  ],
  'dime-dime-baby-ai': [
    'hit-the-road-dude-ai',
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
    'sheru-bhai-ai',
    'crazy-frog-ai',
    'ozil-ai',
    'pollo-ai-kissing',
    'tiny-desk-ai',
  ],
  'crazy-frog-ai': [
    'sheru-bhai-ai',
    'hit-the-road-dude-ai',
    'flying-car-ai',
    'ozil-ai',
    'dime-dime-baby-ai',
  ],
  'bulin-47-ai': [
    '58th-floor-ai',
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
    'hit-the-road-dude-ai',
    'dime-dime-baby-ai',
    'bulin-47-ai',
    'ozil-ai',
    'pollo-ai-kissing',
  ],
  'tiny-desk-ai': [
    'higgsfield-katana',
    '58th-floor-ai',
    'burning-bridges-ai',
    'pollo-ai-kissing',
    'flying-car-ai',
  ],
};
