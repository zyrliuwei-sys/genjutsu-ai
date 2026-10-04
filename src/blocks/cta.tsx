import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { Reveal } from '@/components/reveal';

/** Closing frame: a widescreen still with the pitch set as its subtitle. */
export function CTA() {
  return (
    <section className="px-4 pb-24 sm:pb-32">
      <Reveal className="mx-auto max-w-7xl">
        <div className="eg-screen relative overflow-hidden rounded-lg">
          <img
            src="/imgs/showcase/show-space.jpg"
            alt={m['landing.alt.cta']()}
            width={576}
            height={942}
            loading="lazy"
            className="absolute inset-0 size-full object-cover object-[50%_35%] opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60" />
          <div className="relative flex min-h-[460px] flex-col items-center justify-end px-6 pt-24 pb-14 text-center text-white sm:min-h-[520px] sm:pb-16">
            <p className="font-mono text-[11px] tracking-[0.18em] text-white/60 uppercase">
              {m['landing.cta.eyebrow']()}
            </p>
            <h2 className="eg-heading mt-4 max-w-3xl text-4xl leading-[1.04] text-balance sm:text-6xl">
              {m['landing.cta.headline']()}
            </h2>
            <p className="mt-5 max-w-xl text-white/75 sm:text-lg">
              {m['landing.cta.subheadline']()}
            </p>
            <Link
              href="/create"
              className="eg-pill-primary mt-9 px-7 py-3 text-base"
            >
              {m['landing.cta.button']()}
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
