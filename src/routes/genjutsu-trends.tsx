import { createFileRoute } from '@tanstack/react-router';

import { TREND_HUB_URL } from '@/config/trends';
import { GenjutsuTrends } from '@/blocks/genjutsu-trends';
import { trendsFaq, trendsMeta } from '@/content/genjutsu-trends';

export const Route = createFileRoute('/genjutsu-trends')({
  head: () => ({
    meta: [
      { title: trendsMeta.title },
      { name: 'description', content: trendsMeta.description },
      { property: 'og:title', content: trendsMeta.title },
      { property: 'og:description', content: trendsMeta.description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: TREND_HUB_URL },
      {
        property: 'og:image',
        content: 'https://genjutsu-ai.org/imgs/hit-the-road-dude/og.jpg',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    // This editorial page has one English URL and no translated alternates.
    links: [{ rel: 'canonical', href: TREND_HUB_URL }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              name: trendsMeta.title,
              description: trendsMeta.description,
              url: TREND_HUB_URL,
              inLanguage: 'en',
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: 'https://genjutsu-ai.org/',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Genjutsu AI Trends',
                  item: TREND_HUB_URL,
                },
              ],
            },
            {
              '@type': 'FAQPage',
              mainEntity: trendsFaq.map(({ q, a }) => ({
                '@type': 'Question',
                name: q,
                acceptedAnswer: { '@type': 'Answer', text: a },
              })),
            },
          ],
        }).replace(/</g, '\\u003c'),
      },
    ],
  }),
  component: GenjutsuTrends,
});
