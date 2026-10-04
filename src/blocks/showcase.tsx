import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { Reveal } from '@/components/reveal';

import { createHref, SHOWCASE_ITEMS } from './showcase-items';

/** Auto-scrolling strip of prompt ideas; each card opens the studio. */
export function Showcase() {
  const items = [...SHOWCASE_ITEMS, ...SHOWCASE_ITEMS];

  return (
    <section id="ideas" className="scroll-mt-20 overflow-hidden py-24 sm:py-32">
      <Reveal className="mx-auto mb-12 flex max-w-7xl flex-wrap items-end justify-between gap-6 px-4">
        <div>
          <h2 className="eg-heading text-4xl leading-[1.05] sm:text-5xl">
            {m['landing.showcase.title']()}
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg text-lg">
            {m['landing.showcase.description']()}
          </p>
        </div>
        <Link href="/create" className="eg-pill-primary">
          {m['landing.showcase.cta']()}
        </Link>
      </Reveal>
      <div className="eg-marquee flex w-max gap-4 px-4">
        {items.map((item, i) => (
          <Link
            key={`${item.key}-${i}`}
            href={createHref(item)}
            aria-hidden={i >= SHOWCASE_ITEMS.length || undefined}
            tabIndex={i >= SHOWCASE_ITEMS.length ? -1 : undefined}
            className="group w-48 shrink-0 sm:w-56"
          >
            <div className="eg-screen aspect-[9/14] overflow-hidden rounded-md">
              <img
                src={item.image}
                alt={tDynamic(`landing.showcase.${item.key}`)}
                width={576}
                height={942}
                loading="lazy"
                className="size-full object-cover transition duration-700 group-hover:scale-[1.04]"
              />
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <p className="eg-heading text-xl">
                {tDynamic(`landing.showcase.${item.key}`)}
              </p>
              <p className="text-primary-text font-mono text-[10px] tracking-[0.14em] uppercase opacity-0 transition group-hover:opacity-100">
                {m['landing.showcase.create']()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
