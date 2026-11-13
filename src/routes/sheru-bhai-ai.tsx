import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { SHERU_PAGE_PATH, trendBreadcrumbSchema } from '@/config/trends';
import { SheruBhaiAi } from '@/blocks/sheru-bhai-ai';
import { sheruFaq, sheruMeta } from '@/content/sheru';

const url = `${envConfigs.app_url}${SHERU_PAGE_PATH}`;

export const Route = createFileRoute('/sheru-bhai-ai')({
  head: () => ({
    meta: [
      { title: sheruMeta.title },
      { name: 'description', content: sheruMeta.description },
      { property: 'og:title', content: sheruMeta.title },
      { property: 'og:description', content: sheruMeta.description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url },
      {
        property: 'og:image',
        content: `${envConfigs.app_url}/videos/sheru/palace.jpg`,
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
              name: sheruMeta.title,
              description: sheruMeta.description,
              url,
              inLanguage: 'en',
            },
            trendBreadcrumbSchema(
              'Sheru Bhai AI',
              url,
              `${envConfigs.app_url}/`
            ),
            {
              '@type': 'FAQPage',
              mainEntity: sheruFaq.map(({ q, a }) => ({
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
  component: SheruBhaiAi,
});
