import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';

import { DAME_HOMBRO_THEMES } from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';
import { ThemeReelCard } from '@/components/theme-reel-card';

import '@/styles/dame-hombro-ai.css';

/** A row of shoulders bouncing left-right between sections — the page's motif. */
function Shoulders() {
  return (
    <div className="hombro-shoulders" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} style={{ animationDelay: `${(i % 2) * 0.25}s` }} />
      ))}
    </div>
  );
}

/** Hero visual: the first take on loop in a phone-shaped stage. */
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
    <div className="hombro-stage" aria-hidden>
      <video
        ref={video}
        src="/videos/dame-hombro/crowd.mp4"
        poster="/videos/dame-hombro/crowd.jpg"
        muted
        loop
        playsInline
        preload="none"
      />
      <span className="hombro-tag">{m['hombro.hero.tag']()}</span>
      <span className="hombro-chant">{m['hombro.hero.chant']()}</span>
    </div>
  );
}

export function DameHombroAi() {
  const takeTitles: Record<
    (typeof DAME_HOMBRO_THEMES)[number]['slug'],
    string
  > = {
    crowd: m['hombro.examples.crowd'](),
    dog: m['hombro.examples.dog'](),
    terrace: m['hombro.examples.terrace'](),
    studio: m['hombro.examples.studio'](),
  };
  const steps = [
    {
      title: m['hombro.steps.one.title'](),
      body: m['hombro.steps.one.body'](),
    },
    {
      title: m['hombro.steps.two.title'](),
      body: m['hombro.steps.two.body'](),
    },
    {
      title: m['hombro.steps.three.title'](),
      body: m['hombro.steps.three.body'](),
    },
  ];
  const checks = [
    {
      title: m['hombro.check.one.title'](),
      body: m['hombro.check.one.body'](),
    },
    {
      title: m['hombro.check.two.title'](),
      body: m['hombro.check.two.body'](),
    },
    {
      title: m['hombro.check.three.title'](),
      body: m['hombro.check.three.body'](),
    },
  ];
  const questions = [
    { q: m['hombro.faq.one.q'](), a: m['hombro.faq.one.a']() },
    { q: m['hombro.faq.two.q'](), a: m['hombro.faq.two.a']() },
    { q: m['hombro.faq.three.q'](), a: m['hombro.faq.three.a']() },
    { q: m['hombro.faq.four.q'](), a: m['hombro.faq.four.a']() },
    { q: m['hombro.faq.five.q'](), a: m['hombro.faq.five.a']() },
    { q: m['hombro.faq.six.q'](), a: m['hombro.faq.six.a']() },
  ];
  const pickTake = (slug: string) => {
    window.dispatchEvent(
      new CustomEvent('genjutsu:select-template', { detail: `hombro-${slug}` })
    );
    document
      .getElementById('hombro-studio')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <>
      <Header />
      <main className="hombro-page">
        <section className="hombro-hero" aria-labelledby="hombro-title">
          <div>
            <p className="hombro-eyebrow">{m['hombro.eyebrow']()}</p>
            <h1 id="hombro-title">
              {m['hombro.hero.title']()}{' '}
              <span>{m['hombro.hero.generator']()}</span>
            </h1>
            <p className="hombro-intro">
              <span className="hombro-long">
                {m['hombro.hero.description']()}
              </span>
              <span className="hombro-short">
                {m['hombro.hero.description_short']()}
              </span>
            </p>
            <div className="hombro-actions">
              <a href="#hombro-studio" className="hombro-button">
                {m['hombro.hero.cta']()}
                <ArrowRight size={18} aria-hidden />
              </a>
              <a href="#hombro-how" className="hombro-text-link">
                {m['hombro.hero.secondary']()}
                <ArrowDown size={15} aria-hidden />
              </a>
            </div>
            <ul className="hombro-facts">
              {[
                m['hombro.strip.one'](),
                m['hombro.strip.two'](),
                m['hombro.strip.three'](),
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
          id="hombro-studio"
          className="hombro-studio"
          aria-labelledby="hombro-studio-title"
        >
          <div className="hombro-section-head hombro-studio-head">
            <h2 id="hombro-studio-title">{m['hombro.studio.title']()}</h2>
            <p>{m['hombro.studio.description']()}</p>
          </div>
          <GenjutsuGenerator theme="hombro" returnPath="/dame-hombro-ai" />
          <p className="hombro-price">
            {m['hombro.price']({
              price: `$${(pricingCatalog.pack_starter.priceInCents / 100).toFixed(2)}`,
            })}
          </p>
        </section>

        <Shoulders />

        <section
          id="hombro-examples"
          className="hombro-section"
          aria-labelledby="hombro-examples-title"
        >
          <div className="hombro-section-head">
            <h2 id="hombro-examples-title">{m['hombro.examples.title']()}</h2>
            <p>{m['hombro.examples.description']()}</p>
          </div>
          <div className="hombro-reel">
            {DAME_HOMBRO_THEMES.map((take, i) => (
              <ThemeReelCard
                key={take.slug}
                index={i + 1}
                src={`/videos/dame-hombro/${take.slug}.mp4`}
                poster={`/videos/dame-hombro/${take.slug}.jpg`}
                title={takeTitles[take.slug]}
                actionLabel={m['hombro.examples.use']()}
                onAction={() => pickTake(take.slug)}
              />
            ))}
          </div>
          <p className="hombro-note">{m['hombro.examples.note']()}</p>
        </section>

        <section className="hombro-about" aria-labelledby="hombro-about-title">
          <div className="hombro-section hombro-about-grid">
            <div>
              <p className="hombro-kicker">{m['hombro.about.kicker']()}</p>
              <h2 id="hombro-about-title">{m['hombro.about.title']()}</h2>
              <p className="hombro-about-line">{m['hombro.about.line']()}</p>
            </div>
            <div className="hombro-prose">
              <p>{m['hombro.about.body']()}</p>
              <p>{m['hombro.about.more']()}</p>
            </div>
          </div>
        </section>

        <section
          id="hombro-how"
          className="hombro-section"
          aria-labelledby="hombro-how-title"
        >
          <div className="hombro-section-head">
            <h2 id="hombro-how-title">{m['hombro.steps.title']()}</h2>
            <p>{m['hombro.steps.intro']()}</p>
          </div>
          <ol className="hombro-grid3">
            {steps.map((step, i) => (
              <li key={step.title} className="hombro-card">
                <span className="hombro-step-number" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <Shoulders />

        <section
          className="hombro-section"
          aria-labelledby="hombro-check-title"
        >
          <div className="hombro-section-head">
            <h2 id="hombro-check-title">{m['hombro.check.title']()}</h2>
            <p>{m['hombro.check.intro']()}</p>
          </div>
          <div className="hombro-grid3">
            {checks.map((item) => (
              <article key={item.title} className="hombro-card">
                <Check size={18} aria-hidden />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="hombro-section hombro-faq"
          aria-labelledby="hombro-faq-title"
        >
          <h2 id="hombro-faq-title">{m['hombro.faq.title']()}</h2>
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

        <section className="hombro-cta" aria-labelledby="hombro-cta-title">
          <div className="hombro-cta-inner">
            <h2 id="hombro-cta-title">{m['hombro.cta.title']()}</h2>
            <p>{m['hombro.cta.body']()}</p>
            <a className="hombro-button" href="#hombro-studio">
              {m['hombro.hero.cta']()}
              <ArrowRight size={18} aria-hidden />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
