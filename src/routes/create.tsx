import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';

type Search = {
  kind?: 'video' | 'image';
  prompt?: string;
  model?: string;
};

export const Route = createFileRoute('/create')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    kind:
      search.kind === 'image' || search.kind === 'video'
        ? search.kind
        : undefined,
    prompt:
      typeof search.prompt === 'string'
        ? search.prompt.slice(0, 2000)
        : undefined,
    model: typeof search.model === 'string' ? search.model : undefined,
  }),
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['create.meta_title']({}, { locale }),
      description: m['create.meta_description']({}, { locale }),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const urlFor = (loc: string) =>
      localizeUrl(`${envConfigs.app_url}/create`, { locale: loc as any }).href;
    return {
      meta: [
        { title: loaderData.title },
        { name: 'description', content: loaderData.description },
        { property: 'og:title', content: loaderData.title },
        { property: 'og:description', content: loaderData.description },
        {
          property: 'og:image',
          content: `${envConfigs.app_url}/imgs/showcase/og.jpg`,
        },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      links: [
        { rel: 'canonical', href: urlFor(loaderData.locale) },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
      ],
    };
  },
  component: CreatePage,
});

function CreatePage() {
  return (
    <>
      <Header />
      <main className="relative px-4 pt-8 pb-20">
        <div
          aria-hidden
          className="eg-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] opacity-40"
        />
        <div className="mx-auto max-w-7xl">
          <GenjutsuGenerator />
        </div>
      </main>
      <Footer />
    </>
  );
}
