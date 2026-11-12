import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import {
  ENGLISH_ONLY_PAGE_PATHS,
  PUBLIC_PAGE_PATHS,
} from '@/config/public-pages';
import { GUIDES } from '@/lib/guides';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

type Entry = {
  path: string;
  lastModified?: string;
  changeFrequency: string;
  priority: number;
  englishOnly?: boolean;
};

function urlFor(path: string, locale: string): string {
  return localizeUrl(`${envConfigs.app_url}${path || '/'}`, {
    locale: locale as (typeof locales)[number],
  }).href;
}

// One <url> per locale, each listing the full hreflang set (incl. x-default),
// so every translated page is discoverable on its own.
function entryXml(e: Entry): string {
  if (e.englishOnly)
    return [
      '  <url>',
      `    <loc>${envConfigs.app_url}${e.path}</loc>`,
      `    <changefreq>${e.changeFrequency}</changefreq>`,
      `    <priority>${e.priority}</priority>`,
      '  </url>',
    ].join('\n');
  const alternates = [
    ...locales.map(
      (loc) =>
        `    <xhtml:link rel="alternate" hreflang="${loc}" href="${urlFor(e.path, loc)}"/>`
    ),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(e.path, baseLocale)}"/>`,
  ].join('\n');
  return locales
    .map((loc) =>
      [
        '  <url>',
        `    <loc>${urlFor(e.path, loc)}</loc>`,
        alternates,
        e.lastModified ? `    <lastmod>${e.lastModified}</lastmod>` : null,
        `    <changefreq>${e.changeFrequency}</changefreq>`,
        `    <priority>${e.priority}</priority>`,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n');
}

// Guides are English-only: one <url> each, no translated alternates.
function guideXml(path: string, lastModified?: string): string {
  const loc = `${envConfigs.app_url}${path}`;
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${loc}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>`,
    lastModified ? `    <lastmod>${lastModified}</lastmod>` : null,
    '    <changefreq>weekly</changefreq>',
    '    <priority>0.7</priority>',
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const entries: Entry[] = PUBLIC_PAGE_PATHS.map((path) => ({
          path,
          changeFrequency: 'weekly',
          priority: path === '' ? 1 : 0.8,
        }));

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
          ...entries.map(entryXml),
          ...ENGLISH_ONLY_PAGE_PATHS.map((path) =>
            entryXml({
              path,
              changeFrequency: 'weekly',
              priority: 0.8,
              englishOnly: true,
            })
          ),
          guideXml('/guides', GUIDES[0]?.meta.updated_at),
          ...GUIDES.map((guide) => guideXml(guide.href, guide.meta.updated_at)),
          '</urlset>',
          '',
        ].join('\n');

        return new Response(xml, {
          headers: { 'Content-Type': 'application/xml' },
        });
      },
    },
  },
});
