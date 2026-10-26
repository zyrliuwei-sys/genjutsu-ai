import { Suspense } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { getGuideBody, preloadGuideBody } from '@/lib/guide-bodies';
import { getGuide } from '@/lib/guides';
import { m } from '@/paraglide/messages.js';
import { guideCards, GuideGrid } from '@/blocks/guides';

export const Route = createFileRoute('/guides/$slug')({
  loader: async ({ params }) => {
    const guide = getGuide(params.slug);
    if (!guide) throw notFound();
    await preloadGuideBody(guide.slug);
    return guide;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { meta, href } = loaderData;
    const url = `${envConfigs.app_url}${href}`;
    const image = `${envConfigs.app_url}/imgs/showcase/og.jpg`;
    return {
      meta: [
        { title: meta.title },
        { name: 'description', content: meta.description },
        { property: 'og:title', content: meta.title },
        { property: 'og:description', content: meta.description },
        { property: 'og:type', content: 'article' },
        { property: 'og:image', content: image },
        { property: 'article:published_time', content: meta.published_at },
        { property: 'article:modified_time', content: meta.updated_at },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      links: [
        { rel: 'canonical', href: url },
        { rel: 'alternate', hrefLang: 'en', href: url },
        { rel: 'alternate', hrefLang: 'x-default', href: url },
      ],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Article',
                headline: meta.h1,
                description: meta.description,
                inLanguage: 'en',
                datePublished: meta.published_at,
                dateModified: meta.updated_at,
                image,
                mainEntityOfPage: url,
                author: {
                  '@type': 'Organization',
                  name: envConfigs.app_name,
                  url: envConfigs.app_url,
                },
                publisher: {
                  '@type': 'Organization',
                  name: envConfigs.app_name,
                  url: envConfigs.app_url,
                },
              },
              ...(meta.faq?.length
                ? [
                    {
                      '@type': 'FAQPage',
                      mainEntity: meta.faq.map((item) => ({
                        '@type': 'Question',
                        name: item.q,
                        acceptedAnswer: { '@type': 'Answer', text: item.a },
                      })),
                    },
                  ]
                : []),
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { name: 'Home', item: `${envConfigs.app_url}/` },
                  { name: 'Guides', item: `${envConfigs.app_url}/guides` },
                  { name: meta.card_title, item: url },
                ].map((crumb, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  ...crumb,
                })),
              },
            ],
          }).replace(/</g, '\\u003c'),
        },
      ],
    };
  },
  component: GuideArticle,
});

function GuideArticle() {
  const { slug, href, meta } = Route.useLoaderData();
  const Body = getGuideBody(slug)!;
  return (
    <>
      <article className="mx-auto max-w-3xl">
        <nav
          aria-label="Breadcrumb"
          className="text-muted-foreground mb-6 flex flex-wrap gap-2 text-sm"
        >
          <Link href="/">{m['common.systems.home']()}</Link>
          <span aria-hidden="true">/</span>
          <Link href="/guides">{m['guides.title']()}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{meta.card_title}</span>
        </nav>
        <header className="border-border mb-6 border-b pb-6">
          <h1 className="eg-heading text-foreground text-4xl leading-[1.08] md:text-5xl">
            {meta.h1}
          </h1>
          <p className="text-muted-foreground mt-3">{meta.description}</p>
          <p className="text-muted-foreground mt-3 text-xs">
            {m['guides.updated']({ date: meta.updated_at })}
          </p>
        </header>
        <div className="text-foreground/90 text-[15px] leading-7">
          <Suspense fallback={null}>
            <Body />
          </Suspense>
        </div>
        <div className="border-border bg-card/40 mt-12 rounded-2xl border p-6 text-center sm:p-8">
          <p className="eg-heading text-2xl sm:text-3xl">
            {m['guides.cta.title']()}
          </p>
          <Link
            href="/create"
            className="eg-pill-primary mt-5 inline-block px-6 py-2.5 no-underline hover:no-underline"
          >
            {m['guides.cta.button']()}
          </Link>
        </div>
      </article>
      <section className="mx-auto mt-16 max-w-7xl">
        <h2 className="eg-heading text-3xl">{m['guides.related']()}</h2>
        <div className="mt-8">
          <GuideGrid cards={guideCards(href).slice(0, 4)} />
        </div>
      </section>
    </>
  );
}
