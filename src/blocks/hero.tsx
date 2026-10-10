import { ArrowRight, Clapperboard } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';

/**
 * The hero keeps the product copy intact and makes the actual creator the
 * first interaction on the page. The former prompt composer and showcase
 * screen lived here as a second, separate generator; both are now replaced by
 * the shared Genjutsu workflow below.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-10 pb-20 sm:pt-14 lg:pt-16 lg:pb-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-primary-text inline-flex items-center gap-2.5 text-xs font-medium tracking-[0.12em] uppercase">
            <Clapperboard aria-hidden className="size-4" strokeWidth={1.5} />
            {m['landing.hero.eyebrow']()}
          </p>
          <h1 className="mx-auto mt-5 max-w-5xl font-sans text-[clamp(2.75rem,5.5vw,4.75rem)] leading-[1.06] font-semibold tracking-[-0.055em] text-balance">
            {m['landing.hero.headline']()}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg lg:max-w-none lg:text-[clamp(0.75rem,1.1vw,1rem)] lg:whitespace-nowrap">
            {m['landing.hero.subheadline']()}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href="#genjutsu-studio" className="eg-pill-primary gap-3">
              {m['landing.hero.cta']()}
              <ArrowRight aria-hidden className="size-4" />
            </a>
            <Link href="/pricing" className="eg-pill-light">
              {m['landing.hero.secondary']()}
            </Link>
          </div>
        </div>

        <div id="genjutsu-studio" className="mt-10 scroll-mt-24 lg:mt-12">
          <GenjutsuGenerator />
        </div>
        <p className="text-muted-foreground mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed">
          {m['landing.hero.trust']()}
        </p>
      </div>
    </section>
  );
}
