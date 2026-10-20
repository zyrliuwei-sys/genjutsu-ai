import { Fragment, useEffect } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { track } from '@/lib/track';
import { cn } from '@/lib/utils';
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
          {/* Newest effects get the eyebrow slot: one announcement bar with
              a segment into each effect's landing page. */}
          <div className="border-border bg-card/60 inline-flex max-w-full items-center gap-1 rounded-full border p-1 text-sm shadow-sm">
            <span className="text-primary-text flex shrink-0 items-center gap-1.5 pr-1 pl-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase">
              <span aria-hidden className="relative flex size-1.5">
                <span className="bg-primary absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:hidden" />
                <span className="bg-primary relative size-1.5 rounded-full" />
              </span>
              {m['landing.hero.new_badge']()}
            </span>
            {[
              {
                href: '/ozil-ai',
                target: 'ozil_ai',
                thumb: '/videos/ozil/red-hoodie.jpg',
                thumbPosition: 'object-[30%_45%]',
                name: m['ozil.hero.title'](),
                tag: m['landing.hero.ozil_tag'](),
              },
              {
                href: '/crazy-frog-ai',
                target: 'crazy_frog_ai',
                thumb: '/videos/crazy-frog/neon-city.jpg',
                thumbPosition: 'object-center',
                name: m['frog.hero.title'](),
                tag: m['landing.hero.frog_tag'](),
              },
            ].map((pill, i) => (
              <Fragment key={pill.href}>
                {i > 0 && (
                  <span aria-hidden className="bg-border h-5 w-px shrink-0" />
                )}
                <Link
                  href={pill.href}
                  onClick={() => track('hero_cta', { target: pill.target })}
                  className="hover:bg-muted group flex min-w-0 items-center gap-2 rounded-full py-0.5 pr-2 pl-0.5 transition-colors"
                >
                  <img
                    src={pill.thumb}
                    alt=""
                    aria-hidden
                    width={28}
                    height={28}
                    className={cn(
                      'size-7 shrink-0 rounded-full object-cover ring-1 ring-white/10',
                      pill.thumbPosition
                    )}
                  />
                  <span className="truncate font-semibold">{pill.name}</span>
                  <span className="text-muted-foreground truncate max-md:hidden">
                    {pill.tag}
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="text-muted-foreground group-hover:text-foreground size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </Fragment>
            ))}
          </div>
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
