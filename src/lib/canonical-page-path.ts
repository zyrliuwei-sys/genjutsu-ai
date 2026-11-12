import {
  ENGLISH_ONLY_PAGE_PATHS,
  PUBLIC_PAGE_PATHS,
} from '@/config/public-pages';

const publicPaths = new Set([...PUBLIC_PAGE_PATHS, '/guides']);

/** Only public content pages are normalized; API, asset and app paths are untouched. */
export function canonicalPagePath(pathname: string): string {
  const englishPath = pathname
    .replace(/\/+$/, '')
    .replace(/^\/(?:de|fr|es|pt-br)(?=\/)/, '');
  if (ENGLISH_ONLY_PAGE_PATHS.includes(englishPath)) return englishPath;
  if (pathname === '/' || !pathname.endsWith('/')) return pathname;
  const withoutSlash = pathname.replace(/\/+$/, '');
  const unlocalized = withoutSlash.replace(/^\/(?:de|fr|es|pt-br)(?=\/)/, '');
  return publicPaths.has(unlocalized) ? withoutSlash : pathname;
}
