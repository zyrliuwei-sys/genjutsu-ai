import { useEffect, useState } from 'react';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link, useRouter } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { PromptBox } from '@/components/prompt-box';

import { createHref, HERO_CARDS } from './showcase-items';

const TAKE_MS = 5200;

/**
 * The hero is a screening: copy + composer on the left, and on the right a
 * dark "screen" that cycles through real renders with the prompt that made
 * each one burned in as a subtitle.
 */
export function Hero() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setTimeout(
      () => setActive((i) => (i + 1) % HERO_CARDS.length),
      TAKE_MS
    );
    return () => window.clearTimeout(id);
  }, [active, paused]);

  const card = HERO_CARDS[active];
  const label = tDynamic(`landing.hero.card_${card.key}`);

  return (
    <section className="relative overflow-hidden px-4 pt-12 pb-20 sm:pt-16 lg:pt-14 lg:pb-28">
      <div
        aria-hidden
        className="eg-glow pointer-events-none absolute inset-0 -z-10"
      />
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-20">
        {/* Copy + composer */}
        <div>
          <p className="eg-eyebrow">{m['landing.hero.eyebrow']()}</p>
          <h1 className="eg-heading mt-5 max-w-3xl text-[44px] leading-[1.02] text-balance whitespace-pre-line sm:text-6xl lg:text-[76px]">
            {m['landing.hero.headline']()}
          </h1>
          <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
            {m['landing.hero.subheadline']()}
          </p>

          <PromptBox
            className="mt-9 max-w-2xl"
            placeholder={m['landing.hero.placeholder']()}
            videoLabel={m['landing.hero.kind_video']()}
            imageLabel={m['landing.hero.kind_image']()}
            submitLabel={m['landing.hero.cta']()}
            onSubmit={({ prompt, kind }) =>
              router.push(
                prompt ? createHref({ kind, prompt }) : `/create?kind=${kind}`
              )
            }
          />

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/create" className="eg-pill-primary px-6">
              {m['landing.hero.cta']()}
            </Link>
            <Link href="/pricing" className="eg-pill-light px-6">
              {m['landing.hero.secondary']()}
            </Link>
          </div>
          <p className="text-muted-foreground mt-6 text-sm">
            {m['landing.hero.trust']()}
          </p>
        </div>

        {/* The screen */}
        <div
          className="mx-auto w-full max-w-[360px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <Link
            href={createHref(card)}
            className="eg-screen group relative block aspect-[9/14] overflow-hidden rounded-lg"
          >
            <img
              key={card.key}
              src={card.image}
              alt={label}
              width={576}
              height={942}
              fetchPriority={active === 0 ? 'high' : undefined}
              className="eg-fade-in absolute inset-0 size-full object-cover"
            />
            {/* letterbox bars carry the timecode and the subtitle */}
            <div className="absolute inset-x-0 top-0 flex h-11 items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 font-mono text-[11px] tracking-[0.14em] text-white/80 uppercase">
              <span>{label}</span>
              <span>00:00:{String((active + 1) * 5).padStart(2, '0')}:00</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-5 pt-24 pb-5 text-center">
              <p className="font-mono text-[10px] tracking-[0.18em] text-white/55 uppercase">
                {m['landing.hero.now_showing']()}
              </p>
              <p key={card.key} className="eg-subtitle eg-fade-in mt-2">
                {card.prompt}
              </p>
            </div>
          </Link>

          {/* Take selector */}
          <div className="mt-4 grid grid-cols-5 gap-2">
            {HERO_CARDS.map((item, i) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActive(i)}
                aria-label={tDynamic(`landing.hero.card_${item.key}`)}
                aria-pressed={i === active}
                className={cn(
                  'relative aspect-[3/4] overflow-hidden rounded-sm transition',
                  i === active
                    ? 'ring-primary ring-2 ring-offset-2 ring-offset-[var(--background)]'
                    : 'opacity-50 hover:opacity-90'
                )}
              >
                <img
                  src={item.image}
                  alt=""
                  width={576}
                  height={942}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
