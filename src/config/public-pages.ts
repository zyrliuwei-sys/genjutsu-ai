import {
  FLOOR_PAGE_PATH,
  SHERU_PAGE_PATH,
  TREND_HUB_PATH,
  TREND_PAGES,
} from './trends';

/** These pages have one English URL, never translated sitemap entries. */
export const ENGLISH_ONLY_PAGE_PATHS = [
  TREND_HUB_PATH,
  FLOOR_PAGE_PATH,
  SHERU_PAGE_PATH,
];

/** Canonical public paths use no trailing slash, except the site root. */
export const PUBLIC_PAGE_PATHS = [
  '',
  '/create',
  ...TREND_PAGES.map(({ slug }) => `/${slug}`).filter(
    (path) => !ENGLISH_ONLY_PAGE_PATHS.includes(path)
  ),
  '/pricing',
  '/privacy-policy',
  '/terms-of-service',
  '/aup',
  '/ai-genjutsu-generator',
  '/genjutsu-video-ai',
  '/genjutsu-free',
  '/higgsfield-genjutsu-alternative',
];
