import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { About } from '@/blocks/about';
import { Audience } from '@/blocks/audience';
import { CTA } from '@/blocks/cta';
import { FAQ, FAQ_KEYS } from '@/blocks/faq';
import { Features } from '@/blocks/features';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { Hero } from '@/blocks/hero';
import { Models } from '@/blocks/models';
import { Pricing } from '@/blocks/pricing';
import { Showcase } from '@/blocks/showcase';

export const Route = createFileRoute('/')({
  loader: () => ({ locale: getLocale() }),
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['common.metadata.title']({}, { locale: locale as any });
    const description = m['common.metadata.description'](
      {},
      { locale: locale as any }
    );
    const t = (key: string) =>
      (
        (m as Record<string, unknown>)[key] as (
          p: object,
          o: { locale: any }
        ) => string
      )({}, { locale });
    const urlFor = (loc: string) =>
      localizeUrl(`${envConfigs.app_url}/`, { locale: loc as any }).href;
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        {
          property: 'og:image',
          content: `${envConfigs.app_url}/imgs/showcase/og.jpg`,
        },
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
                primaryImageOfPage: `${envConfigs.app_url}/imgs/showcase/og.jpg`,
              },
              {
                '@type': 'SoftwareApplication',
                name: envConfigs.app_name,
                applicationCategory: 'MultimediaApplication',
                operatingSystem: 'Web',
                url: urlFor(locale),
                description,
                offers: { '@type': 'Offer', price: '5', priceCurrency: 'USD' },
              },
              {
                '@type': 'FAQPage',
                mainEntity: FAQ_KEYS.map((key) => ({
                  '@type': 'Question',
                  name: t(`landing.faq.${key}.question`),
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: t(`landing.faq.${key}.answer`),
                  },
                })),
              },
            ],
          }),
        },
      ],
    };
  },
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <Models />
        <Showcase />
        <About />
        <Audience />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
