import { GUIDE_METAS } from '@/content/guides';

/**
 * English-only guides: metadata in src/content/guides/index.ts, bodies in
 * src/content/guides/<slug>.en.mdx, served at /guides/<slug>.
 */
export type GuideMeta = {
  title: string;
  h1: string;
  /** Short label for cards (homepage, related guides). */
  card_title: string;
  description: string;
  published_at: string;
  updated_at: string;
  /** Questions answered on the page, emitted as FAQPage structured data. */
  faq?: { q: string; a: string }[];
};

export type Guide = { slug: string; href: string; meta: GuideMeta };

/** In display order (newest first, as listed in the registry). */
export const GUIDES: Guide[] = Object.entries(GUIDE_METAS).map(
  ([slug, meta]) => ({ slug, href: `/guides/${slug}`, meta })
);

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug);
}
