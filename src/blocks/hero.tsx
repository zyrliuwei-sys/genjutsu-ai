import { useEffect } from 'react';
import { ArrowRight, Clapperboard } from 'lucide-react';

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
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
            {m['landing.hero.subheadline']()}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#genjutsu-upload"
              className="eg-pill-primary gap-3"
              onClick={() => track('hero_cta', { target: 'upload' })}
            >
              {m['landing.hero.cta']()}
              <ArrowRight aria-hidden className="size-4" />
            </a>
            <a
              href="#genjutsu-effects"
              className="eg-pill-light"
              onClick={() => track('hero_cta', { target: 'effects' })}
            >
              {m['landing.hero.secondary']()}
            </a>
          </div>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm">
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
