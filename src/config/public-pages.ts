import { TREND_PAGES } from './trends';

/** Canonical public paths use no trailing slash, except the site root. */
export const PUBLIC_PAGE_PATHS = [
  '',
  '/create',
  ...TREND_PAGES.map(({ slug }) => `/${slug}`),
  '/pricing',
  '/privacy-policy',
  '/terms-of-service',
  '/aup',
  '/ai-genjutsu-generator',
  '/genjutsu-video-ai',
  '/genjutsu-free',
  '/higgsfield-genjutsu-alternative',
];
