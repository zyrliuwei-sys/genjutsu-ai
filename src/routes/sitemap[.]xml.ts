import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { GUIDES } from '@/lib/guides';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

const STATIC_PATHS = [
  '',
  '/create',
  '/flying-car-ai',
  '/ozil-ai',
  '/crazy-frog-ai',
  '/bulin-47-ai',
  '/pollo-ai-kissing',
  '/burning-bridges-ai',
  '/pricing',
  '/privacy-policy',
  '/terms-of-service',
  '/aup',
  '/ai-genjutsu-generator',
  '/genjutsu-video-ai',
  '/genjutsu-free',
  '/higgsfield-genjutsu-alternative',
];

type Entry = {
  path: string;
  lastModified?: string;
  changeFrequency: string;
  priority: number;
};

function urlFor(path: string, locale: string): string {
  return localizeUrl(`${envConfigs.app_url}${path || '/'}`, {
    locale: locale as (typeof locales)[number],
  }).href;
}

// One <url> per locale, each listing the full hreflang set (incl. x-default),
// so every translated page is discoverable on its own.
function entryXml(e: Entry): string {
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
        const entries: Entry[] = STATIC_PATHS.map((path) => ({
          path,
          changeFrequency: 'weekly',
          priority: path === '' ? 1 : 0.8,
        }));

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
          ...entries.map(entryXml),
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
