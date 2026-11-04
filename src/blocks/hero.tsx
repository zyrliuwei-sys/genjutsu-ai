import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

import { pricingCatalog } from '@/config/pricing';
import { formatUsd } from '@/lib/payment-options';
import { track } from '@/lib/track';
import { m } from '@/paraglide/messages.js';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';

// Reports how far the visitor scrolled and how long they stayed, once, when
// the page is hidden — tells "left at first screen" apart from "read and left".
function useExitTracking() {
  useEffect(() => {
    const start = Date.now();
    let maxDepth = 0;
    let sent = false;
    const onScroll = () => {
      const doc = document.documentElement;
      const depth = (window.scrollY + window.innerHeight) / doc.scrollHeight;
      maxDepth = Math.max(maxDepth, Math.min(100, Math.round(depth * 100)));
    };
    const onHide = () => {
      if (sent || document.visibilityState !== 'hidden') return;
      sent = true;
      track('page_exit', {
        depth: maxDepth,
        seconds: Math.round((Date.now() - start) / 1000),
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);
}

/**
 * The hero sells the effect (you, swapped into a viral clip) and sends the
 * visitor straight to the photo upload — the default effect is preselected.
 */
export function Hero() {
  useExitTracking();
  const entryPrice = formatUsd(pricingCatalog.pack_starter.priceInCents);

  return (
    <section className="relative overflow-hidden px-4 pt-10 pb-6 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="mx-auto max-w-5xl font-sans text-[clamp(2.75rem,5.5vw,4.75rem)] leading-[1.06] font-semibold tracking-[-0.055em] text-balance">
            {m['landing.hero.headline']()}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
            <span className="max-md:hidden">
              {m['landing.hero.subheadline']()}
            </span>
            <span className="md:hidden">
              {m['landing.hero.subheadline_short']()}
            </span>
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#genjutsu-upload"
              className="eg-pill-primary max-w-full gap-3 px-5 text-center whitespace-normal"
              data-testid="hero-paid-cta"
              onClick={() =>
                track('hero_cta', {
                  target: 'upload',
                  price: pricingCatalog.pack_starter.priceInCents,
                  flow: 'direct_payment_v1',
                })
              }
            >
              {m['landing.hero.paid_cta']({ price: entryPrice })}
              <ArrowRight aria-hidden className="size-4" />
            </a>
          </div>
          <p
            className="text-muted-foreground mt-3 text-sm"
            data-testid="hero-price-note"
          >
            {m['landing.hero.paid_note']()}
          </p>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm max-md:hidden">
            {m['landing.hero.trust']()}
          </p>
        </div>

        <div id="genjutsu-studio" className="mt-10 scroll-mt-24 lg:mt-12">
          <GenjutsuGenerator />
        </div>
      </div>
    </section>
  );
}
