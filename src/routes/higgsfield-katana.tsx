import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { trendBreadcrumbSchema } from '@/config/trends';
import { HiggsfieldKatana } from '@/blocks/higgsfield-katana';
import {
  KATANA_PATH,
  katanaExamples,
  katanaFaq,
  katanaMeta,
} from '@/content/katana';

const url = `${envConfigs.app_url}${KATANA_PATH}`;

export const Route = createFileRoute('/higgsfield-katana')({
  head: () => ({
    meta: [
      { title: katanaMeta.title },
      { name: 'description', content: katanaMeta.description },
      { property: 'og:title', content: katanaMeta.title },
      { property: 'og:description', content: katanaMeta.description },
      { property: 'og:type', content: 'article' },
      { property: 'og:url', content: url },
      { property: 'og:image', content: katanaExamples[0].poster },
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
              '@type': 'Article',
              headline: katanaMeta.title,
              description: katanaMeta.description,
              url,
              mainEntityOfPage: url,
              image: katanaExamples[0].poster,
              datePublished: katanaMeta.checked,
              dateModified: katanaMeta.checked,
              inLanguage: 'en',
              author: {
                '@type': 'Organization',
                name: envConfigs.app_name,
                url: envConfigs.app_url,
              },
            },
            trendBreadcrumbSchema(
              'Higgsfield Katana',
              url,
              `${envConfigs.app_url}/`
            ),
            {
              '@type': 'FAQPage',
              mainEntity: katanaFaq.map(({ q, a }) => ({
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
  component: HiggsfieldKatana,
});
