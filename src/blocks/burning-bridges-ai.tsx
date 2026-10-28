import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';

import { BURNING_BRIDGES_THEMES } from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';
import { ThemeReelCard } from '@/components/theme-reel-card';

import '@/styles/burning-bridges-ai.css';

/** A row of chandelier crystals swaying between sections — the page's motif. */
function Crystals() {
  const drops = [18, 30, 24, 40, 28, 46, 28, 40, 24, 30, 18];
  return (
    <div className="bridges-crystals" aria-hidden>
      {drops.map((height, i) => (
        <span key={i} style={{ height, animationDelay: `${(i % 4) * 0.3}s` }} />
      ))}
    </div>
  );
}

/** Hero visual: the first take on loop in a widescreen frame. */
function Stage() {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Phones hide the stage, so only play where it is shown.
    if (!window.matchMedia('(min-width: 900px)').matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void el.play().catch(() => {});
      else el.pause();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="bridges-stage" aria-hidden>
      <video
        ref={video}
        src="/videos/burning-bridges/black-tee.mp4"
        poster="/videos/burning-bridges/black-tee.jpg"
        muted
        loop
        playsInline
        preload="none"
      />
      <span className="bridges-tag">{m['bridges.hero.tag']()}</span>
    </div>
  );
}

export function BurningBridgesAi() {
  const takeTitles: Record<
    (typeof BURNING_BRIDGES_THEMES)[number]['slug'],
    string
  > = {
    'black-tee': m['bridges.examples.black_tee'](),
    tracksuit: m['bridges.examples.tracksuit'](),
    'white-polo': m['bridges.examples.white_polo'](),
    'teal-blazer': m['bridges.examples.teal_blazer'](),
  };
  const steps = [
    {
      title: m['bridges.steps.one.title'](),
      body: m['bridges.steps.one.body'](),
    },
    {
      title: m['bridges.steps.two.title'](),
      body: m['bridges.steps.two.body'](),
    },
    {
      title: m['bridges.steps.three.title'](),
      body: m['bridges.steps.three.body'](),
    },
  ];
  const checks = [
    {
      title: m['bridges.check.one.title'](),
      body: m['bridges.check.one.body'](),
    },
    {
      title: m['bridges.check.two.title'](),
      body: m['bridges.check.two.body'](),
    },
    {
      title: m['bridges.check.three.title'](),
      body: m['bridges.check.three.body'](),
    },
  ];
  const questions = [
    { q: m['bridges.faq.one.q'](), a: m['bridges.faq.one.a']() },
    { q: m['bridges.faq.two.q'](), a: m['bridges.faq.two.a']() },
    { q: m['bridges.faq.three.q'](), a: m['bridges.faq.three.a']() },
    { q: m['bridges.faq.four.q'](), a: m['bridges.faq.four.a']() },
    { q: m['bridges.faq.five.q'](), a: m['bridges.faq.five.a']() },
    { q: m['bridges.faq.six.q'](), a: m['bridges.faq.six.a']() },
  ];
  const pickTake = (slug: string) => {
    window.dispatchEvent(
      new CustomEvent('genjutsu:select-template', { detail: `bridges-${slug}` })
    );
    document
      .getElementById('bridges-studio')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <>
      <Header />
      <main className="bridges-page">
        <section className="bridges-hero" aria-labelledby="bridges-title">
          <div>
            <p className="bridges-eyebrow">{m['bridges.eyebrow']()}</p>
            <h1 id="bridges-title">
              {m['bridges.hero.title']()}{' '}
              <span>{m['bridges.hero.generator']()}</span>
            </h1>
            <p className="bridges-intro">
              <span className="bridges-long">
                {m['bridges.hero.description']()}
              </span>
              <span className="bridges-short">
                {m['bridges.hero.description_short']()}
              </span>
            </p>
            <div className="bridges-actions">
              <a href="#bridges-studio" className="bridges-button">
                {m['bridges.hero.cta']()}
                <ArrowRight size={18} aria-hidden />
              </a>
              <a href="#bridges-how" className="bridges-text-link">
                {m['bridges.hero.secondary']()}
                <ArrowDown size={15} aria-hidden />
              </a>
            </div>
            <ul className="bridges-facts">
              {[
                m['bridges.strip.one'](),
                m['bridges.strip.two'](),
                m['bridges.strip.three'](),
              ].map((text) => (
                <li key={text}>
                  <Check size={14} aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <Stage />
        </section>

        <section
          id="bridges-studio"
          className="bridges-studio"
          aria-labelledby="bridges-studio-title"
        >
          <div className="bridges-section-head bridges-studio-head">
            <h2 id="bridges-studio-title">{m['bridges.studio.title']()}</h2>
            <p>{m['bridges.studio.description']()}</p>
          </div>
          <GenjutsuGenerator theme="bridges" returnPath="/burning-bridges-ai" />
          <p className="bridges-price">
            {m['bridges.price']({
              price: `$${(pricingCatalog.pack_starter.priceInCents / 100).toFixed(2)}`,
            })}
          </p>
        </section>

        <Crystals />

        <section
          id="bridges-examples"
          className="bridges-section"
          aria-labelledby="bridges-examples-title"
        >
          <div className="bridges-section-head">
            <h2 id="bridges-examples-title">{m['bridges.examples.title']()}</h2>
            <p>{m['bridges.examples.description']()}</p>
          </div>
          <div className="bridges-reel">
            {BURNING_BRIDGES_THEMES.map((take, i) => (
              <ThemeReelCard
                key={take.slug}
                index={i + 1}
                src={`/videos/burning-bridges/${take.slug}.mp4`}
                poster={`/videos/burning-bridges/${take.slug}.jpg`}
                title={takeTitles[take.slug]}
                actionLabel={m['bridges.examples.use']()}
                onAction={() => pickTake(take.slug)}
              />
            ))}
          </div>
          <p className="bridges-note">{m['bridges.examples.note']()}</p>
        </section>

        <section
          className="bridges-about"
          aria-labelledby="bridges-about-title"
        >
          <div className="bridges-section bridges-about-grid">
            <div>
              <p className="bridges-kicker">{m['bridges.about.kicker']()}</p>
              <h2 id="bridges-about-title">{m['bridges.about.title']()}</h2>
              <p className="bridges-about-line">{m['bridges.about.line']()}</p>
            </div>
            <div className="bridges-prose">
              <p>{m['bridges.about.body']()}</p>
              <p>{m['bridges.about.more']()}</p>
            </div>
          </div>
        </section>

        <section
          id="bridges-how"
          className="bridges-section"
          aria-labelledby="bridges-how-title"
        >
          <div className="bridges-section-head">
            <h2 id="bridges-how-title">{m['bridges.steps.title']()}</h2>
            <p>{m['bridges.steps.intro']()}</p>
          </div>
          <ol className="bridges-grid3">
            {steps.map((step, i) => (
              <li key={step.title} className="bridges-card">
                <span className="bridges-step-number" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <Crystals />

        <section
          className="bridges-section"
          aria-labelledby="bridges-check-title"
        >
          <div className="bridges-section-head">
            <h2 id="bridges-check-title">{m['bridges.check.title']()}</h2>
            <p>{m['bridges.check.intro']()}</p>
          </div>
          <div className="bridges-grid3">
            {checks.map((item) => (
              <article key={item.title} className="bridges-card">
                <Check size={18} aria-hidden />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="bridges-section bridges-faq"
          aria-labelledby="bridges-faq-title"
        >
          <h2 id="bridges-faq-title">{m['bridges.faq.title']()}</h2>
          <div>
            {questions.map((item) => (
              <details key={item.q}>
                <summary>
                  {item.q}
                  <span aria-hidden>+</span>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bridges-cta" aria-labelledby="bridges-cta-title">
          <div className="bridges-cta-inner">
            <h2 id="bridges-cta-title">{m['bridges.cta.title']()}</h2>
            <p>{m['bridges.cta.body']()}</p>
            <a className="bridges-button" href="#bridges-studio">
              {m['bridges.hero.cta']()}
              <ArrowRight size={18} aria-hidden />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
