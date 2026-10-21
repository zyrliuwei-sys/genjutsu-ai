import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { FlyingCarAi } from '@/blocks/flying-car-ai';

export const Route = createFileRoute('/flying-car-ai')({
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['flycar.meta.title']({}, { locale }),
      description: m['flycar.meta.description']({}, { locale }),
      faq: (['one', 'two', 'three', 'four', 'five', 'six'] as const).map(
        (n) => ({
          q: m[`flycar.faq.${n}.q`]({}, { locale }),
          a: m[`flycar.faq.${n}.a`]({}, { locale }),
        })
      ),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { title, description, locale, faq } = loaderData;
    const urlFor = (loc: (typeof locales)[number]) =>
      localizeUrl(`${envConfigs.app_url}/flying-car-ai`, { locale: loc }).href;
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
          content: `${envConfigs.app_url}/imgs/flying-car/og.jpg`,
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
                primaryImageOfPage: `${envConfigs.app_url}/imgs/flying-car/og.jpg`,
              },
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
  component: FlyingCarAi,
});
