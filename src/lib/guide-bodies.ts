import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

// Article bodies, loaded on demand by the article route only — kept apart
// from ./guides so the homepage bundle never includes guide text.
const loaders = import.meta.glob<{ default: ComponentType }>(
  '/src/content/guides/*.en.mdx'
);
const bodies = new Map<string, LazyExoticComponent<ComponentType>>();

const pathOf = (slug: string) => `/src/content/guides/${slug}.en.mdx`;

/** Start fetching a body before render (route loader) to avoid a blank flash. */
export function preloadGuideBody(slug: string) {
  return loaders[pathOf(slug)]?.();
}

export function getGuideBody(slug: string) {
  const load = loaders[pathOf(slug)];
  if (!load) return undefined;
  let body = bodies.get(slug);
  if (!body) {
    body = lazy(load);
    bodies.set(slug, body);
  }
  return body;
}
