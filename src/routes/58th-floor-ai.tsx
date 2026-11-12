import { createFileRoute } from '@tanstack/react-router';

import { FLOOR_PAGE_PATH, trendBreadcrumbSchema } from '@/config/trends';
import { Floor58Ai } from '@/blocks/58th-floor-ai';
import { floorFaq, floorMeta } from '@/content/58th-floor';

const url = `https://genjutsu-ai.org${FLOOR_PAGE_PATH}`;

export const Route = createFileRoute('/58th-floor-ai')({
  head: () => ({
    meta: [
      { title: floorMeta.title },
      { name: 'description', content: floorMeta.description },
      { property: 'og:title', content: floorMeta.title },
      { property: 'og:description', content: floorMeta.description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url },
      {
        property: 'og:image',
        content: 'https://genjutsu-ai.org/videos/58th-floor/handoff.jpg',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: url }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              name: floorMeta.title,
              description: floorMeta.description,
              url,
              inLanguage: 'en',
            },
            trendBreadcrumbSchema(
              '58th Floor AI',
              url,
              'https://genjutsu-ai.org/'
            ),
            {
              '@type': 'FAQPage',
              mainEntity: floorFaq.map(({ q, a }) => ({
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
  component: Floor58Ai,
});
