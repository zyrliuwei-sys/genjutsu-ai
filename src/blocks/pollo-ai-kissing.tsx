import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';

import { KISS_THEMES } from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';
import { ThemeReelCard } from '@/components/theme-reel-card';

import '@/styles/pollo-ai-kissing.css';

/** Two dots drifting together between sections — the page's motif. */
function LeanIn() {
  return (
    <div className="kiss-lean" aria-hidden>
      <span />
      <span />
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
    <div className="kiss-stage" aria-hidden>
      <video
        ref={video}
        src="/videos/pollo-kissing/night-market.mp4"
        poster="/videos/pollo-kissing/night-market.jpg"
        muted
        loop
        playsInline
        preload="none"
      />
      <span className="kiss-tag">{m['kiss.hero.tag']()}</span>
    </div>
  );
}

export function PolloAiKissing() {
  const takeTitles: Record<(typeof KISS_THEMES)[number]['slug'], string> = {
    'city-lights': m['kiss.examples.city_lights'](),
    'night-market': m['kiss.examples.night_market'](),
    'spring-park': m['kiss.examples.spring_park'](),
    'hoop-earrings': m['kiss.examples.hoop_earrings'](),
  };
  const steps = [
    { title: m['kiss.steps.one.title'](), body: m['kiss.steps.one.body']() },
    { title: m['kiss.steps.two.title'](), body: m['kiss.steps.two.body']() },
    {
      title: m['kiss.steps.three.title'](),
      body: m['kiss.steps.three.body'](),
    },
  ];
  const checks = [
    { title: m['kiss.check.one.title'](), body: m['kiss.check.one.body']() },
    { title: m['kiss.check.two.title'](), body: m['kiss.check.two.body']() },
    {
      title: m['kiss.check.three.title'](),
      body: m['kiss.check.three.body'](),
    },
  ];
  const questions = [
    { q: m['kiss.faq.one.q'](), a: m['kiss.faq.one.a']() },
    { q: m['kiss.faq.two.q'](), a: m['kiss.faq.two.a']() },
    { q: m['kiss.faq.three.q'](), a: m['kiss.faq.three.a']() },
    { q: m['kiss.faq.four.q'](), a: m['kiss.faq.four.a']() },
    { q: m['kiss.faq.five.q'](), a: m['kiss.faq.five.a']() },
    { q: m['kiss.faq.six.q'](), a: m['kiss.faq.six.a']() },
  ];
  const pickTake = (slug: string) => {
    window.dispatchEvent(
      new CustomEvent('genjutsu:select-template', { detail: `kiss-${slug}` })
    );
    document
      .getElementById('kiss-studio')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <>
      <Header />
      <main className="kiss-page">
        <section className="kiss-hero" aria-labelledby="kiss-title">
          <div>
            <p className="kiss-eyebrow">{m['kiss.eyebrow']()}</p>
            <h1 id="kiss-title">
              {m['kiss.hero.title']()} <span>{m['kiss.hero.generator']()}</span>
            </h1>
            <p className="kiss-intro">
              <span className="kiss-long">{m['kiss.hero.description']()}</span>
              <span className="kiss-short">
                {m['kiss.hero.description_short']()}
              </span>
            </p>
            <div className="kiss-actions">
              <a href="#kiss-studio" className="kiss-button">
                {m['kiss.hero.cta']()}
                <ArrowRight size={18} aria-hidden />
              </a>
              <a href="#kiss-how" className="kiss-text-link">
                {m['kiss.hero.secondary']()}
                <ArrowDown size={15} aria-hidden />
              </a>
            </div>
            <ul className="kiss-facts">
              {[
                m['kiss.strip.one'](),
                m['kiss.strip.two'](),
                m['kiss.strip.three'](),
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
          id="kiss-studio"
          className="kiss-studio"
          aria-labelledby="kiss-studio-title"
        >
          <div className="kiss-section-head kiss-studio-head">
            <h2 id="kiss-studio-title">{m['kiss.studio.title']()}</h2>
            <p>{m['kiss.studio.description']()}</p>
          </div>
          <GenjutsuGenerator theme="kiss" returnPath="/pollo-ai-kissing" />
          <p className="kiss-price">
            {m['kiss.price']({
              price: `$${(pricingCatalog.pack_starter.priceInCents / 100).toFixed(2)}`,
            })}
          </p>
        </section>

        <LeanIn />

        <section
          id="kiss-examples"
          className="kiss-section"
          aria-labelledby="kiss-examples-title"
        >
          <div className="kiss-section-head">
            <h2 id="kiss-examples-title">{m['kiss.examples.title']()}</h2>
            <p>{m['kiss.examples.description']()}</p>
          </div>
          <div className="kiss-reel">
            {KISS_THEMES.map((take, i) => (
              <ThemeReelCard
                key={take.slug}
                index={i + 1}
                src={`/videos/pollo-kissing/${take.slug}.mp4`}
                poster={`/videos/pollo-kissing/${take.slug}.jpg`}
                title={takeTitles[take.slug]}
                actionLabel={m['kiss.examples.use']()}
                onAction={() => pickTake(take.slug)}
              />
            ))}
          </div>
          <p className="kiss-note">{m['kiss.examples.note']()}</p>
        </section>

        <section className="kiss-about" aria-labelledby="kiss-about-title">
          <div className="kiss-section kiss-about-grid">
            <div>
              <p className="kiss-kicker">{m['kiss.about.kicker']()}</p>
              <h2 id="kiss-about-title">{m['kiss.about.title']()}</h2>
              <p className="kiss-about-line">{m['kiss.about.line']()}</p>
            </div>
            <div className="kiss-prose">
              <p>{m['kiss.about.body']()}</p>
              <p>{m['kiss.about.more']()}</p>
            </div>
          </div>
        </section>

        <section
          id="kiss-how"
          className="kiss-section"
          aria-labelledby="kiss-how-title"
        >
          <div className="kiss-section-head">
            <h2 id="kiss-how-title">{m['kiss.steps.title']()}</h2>
            <p>{m['kiss.steps.intro']()}</p>
          </div>
          <ol className="kiss-grid3">
            {steps.map((step, i) => (
              <li key={step.title} className="kiss-card">
                <span className="kiss-step-number" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <LeanIn />

        <section className="kiss-section" aria-labelledby="kiss-check-title">
          <div className="kiss-section-head">
            <h2 id="kiss-check-title">{m['kiss.check.title']()}</h2>
            <p>{m['kiss.check.intro']()}</p>
          </div>
          <div className="kiss-grid3">
            {checks.map((item) => (
              <article key={item.title} className="kiss-card">
                <Check size={18} aria-hidden />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="kiss-section kiss-faq"
          aria-labelledby="kiss-faq-title"
        >
          <h2 id="kiss-faq-title">{m['kiss.faq.title']()}</h2>
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

        <section className="kiss-cta" aria-labelledby="kiss-cta-title">
          <div className="kiss-cta-inner">
            <h2 id="kiss-cta-title">{m['kiss.cta.title']()}</h2>
            <p>{m['kiss.cta.body']()}</p>
            <a className="kiss-button" href="#kiss-studio">
              {m['kiss.hero.cta']()}
              <ArrowRight size={18} aria-hidden />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
