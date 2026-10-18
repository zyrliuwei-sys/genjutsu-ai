import { useEffect } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
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
    <section className="relative overflow-hidden px-4 pt-10 pb-6 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-7xl text-center">
          {/* Newest effect gets the eyebrow slot: an announcement pill into
              its own landing page. */}
          <Link
            href="/crazy-frog-ai"
            onClick={() => track('hero_cta', { target: 'crazy_frog' })}
            className="border-border bg-card/60 hover:border-primary/60 group inline-flex max-w-full items-center gap-2.5 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors"
          >
            <img
              src="/videos/crazy-frog/overpass.jpg"
              alt=""
              aria-hidden
              width={28}
              height={28}
              className="size-7 shrink-0 rounded-full object-cover"
            />
            <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
              {m['landing.hero.new_badge']()}
            </span>
            <span className="truncate font-medium max-sm:hidden">
              {m['landing.hero.new_label']()}
            </span>
            <span className="truncate font-medium sm:hidden">
              {m['landing.hero.new_label_short']()}
            </span>
            <ChevronRight
              aria-hidden
              className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <h1 className="mx-auto mt-5 max-w-5xl font-sans text-[clamp(2.75rem,5.5vw,4.75rem)] leading-[1.06] font-semibold tracking-[-0.055em] text-balance">
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

          {/* Phones go straight into the generator below (sticky CTA there). */}
          <div className="mt-7 hidden flex-wrap items-center justify-center gap-3 lg:flex">
            <a
              href="#genjutsu-upload"
              className="eg-pill-primary gap-3"
              onClick={() => track('hero_cta', { target: 'upload' })}
            >
              {m['landing.hero.cta']()}
              <ArrowRight aria-hidden className="size-4" />
            </a>
          </div>
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
