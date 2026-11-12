import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { trendBreadcrumbSchema } from '@/config/trends';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { HitTheRoadDudeAi } from '@/blocks/hit-the-road-dude-ai';

export const Route = createFileRoute('/hit-the-road-dude-ai')({
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['road.meta.title']({ appName: envConfigs.app_name }, { locale }),
      description: m['road.meta.description']({}, { locale }),
      faq: (['one', 'two', 'three', 'four', 'five', 'six'] as const).map(
        (n) => ({
          q: m[`road.faq.${n}.q`]({}, { locale }),
          a: m[`road.faq.${n}.a`]({}, { locale }),
        })
      ),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { title, description, locale, faq } = loaderData;
    const urlFor = (loc: (typeof locales)[number]) =>
      localizeUrl(`${envConfigs.app_url}/hit-the-road-dude-ai`, { locale: loc })
        .href;
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: urlFor(locale) },
        {
          property: 'og:image',
          content: `${envConfigs.app_url}/imgs/hit-the-road-dude/og.jpg`,
        },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      links: [
        { rel: 'canonical', href: urlFor(locale) },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
        { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
      ],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                name: title,
                description,
                url: urlFor(locale),
                inLanguage: locale,
                primaryImageOfPage: `${envConfigs.app_url}/imgs/hit-the-road-dude/og.jpg`,
              },
              trendBreadcrumbSchema(
                'Hit the Road Dude AI',
                urlFor(locale),
                localizeUrl(envConfigs.app_url, { locale }).href
              ),
              {
                '@type': 'FAQPage',
                mainEntity: faq.map((item) => ({
                  '@type': 'Question',
                  name: item.q,
                  acceptedAnswer: { '@type': 'Answer', text: item.a },
                })),
              },
            ],
          }).replace(/</g, '\\u003c'),
        },
      ],
    };
  },
  component: HitTheRoadDudeAi,
});
