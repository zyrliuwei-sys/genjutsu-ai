import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { BeforeAfterVideo } from '@/components/before-after-video';
import { Reveal } from '@/components/reveal';

const SWAPS = [
  {
    key: 'crowd',
    width: 1280,
    height: 720,
    photo: undefined,
  },
  {
    key: 'dance',
    width: 720,
    height: 1280,
    photo: '/videos/swap/photo-2.jpg',
  },
] as const;

const COPY = {
  crowd: {
    tag: () => m['landing.swap.crowd.tag'](),
    title: () => m['landing.swap.crowd.title'](),
    description: () => m['landing.swap.crowd.description'](),
  },
  dance: {
    tag: () => m['landing.swap.dance.tag'](),
    title: () => m['landing.swap.dance.title'](),
    description: () => m['landing.swap.dance.description'](),
  },
};

/** Before/after showcase: drag the divider to compare source and result. */
export function Features() {
  const labels = {
    before: m['landing.swap.before'](),
    after: m['landing.swap.after'](),
    slider: m['landing.swap.slider'](),
  };
  return (
    <section
      id="tools"
      className="border-border scroll-mt-20 border-t px-4 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <h2 className="eg-heading max-w-xl text-4xl leading-[1.05] sm:text-5xl">
            {m['landing.swap.title']()}
          </h2>
          <div className="flex flex-col gap-6 lg:items-end">
            <p className="text-muted-foreground max-w-md text-lg leading-relaxed lg:text-right">
              {m['landing.swap.description']()}
            </p>
            <Link href="/create" className="eg-pill-primary">
              {m['landing.swap.cta']()}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
        {/* 3.16fr : 1fr keeps the 16:9 and 9:16 clips the same height. */}
        <div className="mt-16 grid gap-x-8 gap-y-14 lg:grid-cols-[3.16fr_1fr]">
          {SWAPS.map((swap, i) => (
            <Reveal
              key={swap.key}
              delay={i * 90}
              className={
                swap.height > swap.width ? 'mx-auto w-full max-w-sm' : ''
              }
            >
              <BeforeAfterVideo
                before={{
                  src: `/videos/swap/${swap.key}-before.mp4`,
                  poster: `/videos/swap/${swap.key}-before.jpg`,
                }}
                after={{
                  src: `/videos/swap/${swap.key}-after.mp4`,
                  poster: `/videos/swap/${swap.key}-after.jpg`,
                }}
                photo={
                  swap.photo
                    ? { src: swap.photo, label: m['landing.swap.photo']() }
                    : undefined
                }
                labels={labels}
                width={swap.width}
                height={swap.height}
              />
              <p className="eg-eyebrow mt-6">{COPY[swap.key].tag()}</p>
              <h3 className="eg-heading mt-2 text-3xl">
                {COPY[swap.key].title()}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
                {COPY[swap.key].description()}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
