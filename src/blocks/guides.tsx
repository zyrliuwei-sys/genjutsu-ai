import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { GUIDES } from '@/lib/guides';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { CONTENT_SLUGS } from '@/blocks/content-links';
import { GuideCard } from '@/components/guide-card';

const MAX_CARDS = 8;
// Phones get a shorter page: only the first cards are shown there.
const MOBILE_CARDS = 4;

type Card = { href: string; coverTitle: string; title: string };

/** Every guide plus the evergreen content pages, newest guides first. */
export function guideCards(excludeHref?: string): Card[] {
  return [
    ...GUIDES.map((guide) => ({
      href: guide.href,
      coverTitle: guide.meta.h1,
      title: guide.meta.card_title,
    })),
    ...CONTENT_SLUGS.map((slug) => ({
      href: `/${slug}`,
      coverTitle: tDynamic(`landing.resources.${slug}.title`),
      title: tDynamic(`landing.resources.${slug}.title`),
    })),
  ].filter((card) => card.href !== excludeHref);
}

export function GuideGrid({
  cards,
  mobileLimit,
}: {
  cards: Card[];
  mobileLimit?: number;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <GuideCard
          key={card.href}
          {...card}
          brand={envConfigs.app_name}
          label={m['guides.label']()}
          readLabel={m['guides.read']()}
          className={cn(
            mobileLimit !== undefined && index >= mobileLimit && 'max-md:hidden'
          )}
        />
      ))}
    </div>
  );
}

export function Guides() {
  return (
    <section className="border-border border-t px-4 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="eg-heading text-4xl leading-[1.05] sm:text-5xl">
            {m['guides.title']()}
          </h2>
          <Link
            href="/guides"
            className="text-primary text-sm font-semibold hover:underline"
          >
            {m['guides.view_all']()}
          </Link>
        </div>
        <div className="mt-10">
          <GuideGrid
            cards={guideCards().slice(0, MAX_CARDS)}
            mobileLimit={MOBILE_CARDS}
          />
        </div>
      </div>
    </section>
  );
}
