import { createFileRoute } from '@tanstack/react-router';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { guideCards, GuideGrid } from '@/blocks/guides';

export const Route = createFileRoute('/guides/')({
  head: () => {
    const title = m['guides.meta.title']();
    const description = m['guides.meta.description']();
    const url = `${envConfigs.app_url}/guides`;
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
      ],
      links: [
        { rel: 'canonical', href: url },
        { rel: 'alternate', hrefLang: 'en', href: url },
        { rel: 'alternate', hrefLang: 'x-default', href: url },
      ],
    };
  },
  component: GuidesIndex,
});

function GuidesIndex() {
  return (
    <div className="mx-auto max-w-7xl">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground mb-6 flex flex-wrap gap-2 text-sm"
      >
        <Link href="/">{m['common.systems.home']()}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{m['guides.title']()}</span>
      </nav>
      <h1 className="eg-heading text-4xl leading-[1.05] sm:text-5xl">
        {m['guides.index.h1']()}
      </h1>
      <p className="text-muted-foreground mt-4 max-w-2xl sm:text-lg">
        {m['guides.meta.description']()}
      </p>
      <div className="mt-12">
        <GuideGrid cards={guideCards()} />
      </div>
    </div>
  );
}
