import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';

import { BULIN_THEMES } from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';
import { ThemeReelCard } from '@/components/theme-reel-card';

import '@/styles/bulin-47-ai.css';

/** Speaker level meter between sections — the page's motif. */
function Meter() {
  const bars = [10, 22, 16, 30, 18, 26, 12, 34, 20, 14, 28, 16, 24, 10];
  return (
    <div className="bulin-meter" aria-hidden>
      {bars.map((height, i) => (
        <span
          key={i}
          style={{ height, animationDelay: `${(i % 5) * 0.12}s` }}
        />
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
    <div className="bulin-stage" aria-hidden>
      <video
        ref={video}
        src="/videos/bulin/cap.mp4"
        poster="/videos/bulin/cap.jpg"
        muted
        loop
        playsInline
        preload="none"
      />
      <span className="bulin-live">{m['bulin.hero.live']()}</span>
    </div>
  );
}

export function Bulin47Ai() {
  const takeTitles: Record<(typeof BULIN_THEMES)[number]['slug'], string> = {
    cap: m['bulin.examples.cap'](),
    cat: m['bulin.examples.cat'](),
    shades: m['bulin.examples.shades'](),
  };
  const steps = [
    { title: m['bulin.steps.one.title'](), body: m['bulin.steps.one.body']() },
    { title: m['bulin.steps.two.title'](), body: m['bulin.steps.two.body']() },
    {
      title: m['bulin.steps.three.title'](),
      body: m['bulin.steps.three.body'](),
    },
  ];
  const checks = [
    { title: m['bulin.check.one.title'](), body: m['bulin.check.one.body']() },
    { title: m['bulin.check.two.title'](), body: m['bulin.check.two.body']() },
    {
      title: m['bulin.check.three.title'](),
      body: m['bulin.check.three.body'](),
    },
  ];
  const questions = [
    { q: m['bulin.faq.one.q'](), a: m['bulin.faq.one.a']() },
    { q: m['bulin.faq.two.q'](), a: m['bulin.faq.two.a']() },
    { q: m['bulin.faq.three.q'](), a: m['bulin.faq.three.a']() },
    { q: m['bulin.faq.four.q'](), a: m['bulin.faq.four.a']() },
    { q: m['bulin.faq.five.q'](), a: m['bulin.faq.five.a']() },
    { q: m['bulin.faq.six.q'](), a: m['bulin.faq.six.a']() },
  ];
  const pickTake = (slug: string) => {
    window.dispatchEvent(
      new CustomEvent('genjutsu:select-template', { detail: `bulin-${slug}` })
    );
    document
      .getElementById('bulin-studio')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <>
      <Header />
      <main className="bulin-page">
        <section className="bulin-hero" aria-labelledby="bulin-title">
          <div>
            <p className="bulin-eyebrow">{m['bulin.eyebrow']()}</p>
            <h1 id="bulin-title">
              {m['bulin.hero.title']()}{' '}
              <span>{m['bulin.hero.generator']()}</span>
            </h1>
            <p className="bulin-intro">{m['bulin.hero.description']()}</p>
            <div className="bulin-actions">
              <a href="#bulin-studio" className="bulin-button">
                {m['bulin.hero.cta']()}
                <ArrowRight size={18} aria-hidden />
              </a>
              <a href="#bulin-how" className="bulin-text-link">
                {m['bulin.hero.secondary']()}
                <ArrowDown size={15} aria-hidden />
              </a>
            </div>
            <ul className="bulin-facts">
              {[
                m['bulin.strip.one'](),
                m['bulin.strip.two'](),
                m['bulin.strip.three'](),
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
          id="bulin-studio"
          className="bulin-studio"
          aria-labelledby="bulin-studio-title"
        >
          <div className="bulin-section-head">
            <h2 id="bulin-studio-title">{m['bulin.studio.title']()}</h2>
            <p>{m['bulin.studio.description']()}</p>
          </div>
          <GenjutsuGenerator theme="bulin" returnPath="/bulin-47-ai" />
          <p className="bulin-price">
            {m['bulin.price']({
              price: `$${(pricingCatalog.pack_starter.priceInCents / 100).toFixed(2)}`,
            })}
          </p>
        </section>

        <Meter />

        <section
          id="bulin-examples"
          className="bulin-section"
          aria-labelledby="bulin-examples-title"
        >
          <div className="bulin-section-head">
            <h2 id="bulin-examples-title">{m['bulin.examples.title']()}</h2>
            <p>{m['bulin.examples.description']()}</p>
          </div>
          <div className="bulin-reel">
            {BULIN_THEMES.map((take, i) => (
              <ThemeReelCard
                key={take.slug}
                index={i + 1}
                src={`/videos/bulin/${take.slug}.mp4`}
                poster={`/videos/bulin/${take.slug}.jpg`}
                title={takeTitles[take.slug]}
                actionLabel={m['bulin.examples.use']()}
                onAction={() => pickTake(take.slug)}
              />
            ))}
          </div>
          <p className="bulin-note">{m['bulin.examples.note']()}</p>
        </section>

        <section className="bulin-about" aria-labelledby="bulin-about-title">
          <div className="bulin-section bulin-about-grid">
            <div>
              <p className="bulin-kicker">{m['bulin.about.kicker']()}</p>
              <h2 id="bulin-about-title">{m['bulin.about.title']()}</h2>
              <p className="bulin-about-line">{m['bulin.about.line']()}</p>
            </div>
            <div className="bulin-prose">
              <p>{m['bulin.about.body']()}</p>
              <p>{m['bulin.about.more']()}</p>
            </div>
          </div>
        </section>

        <section
          id="bulin-how"
          className="bulin-section"
          aria-labelledby="bulin-how-title"
        >
          <div className="bulin-section-head">
            <h2 id="bulin-how-title">{m['bulin.steps.title']()}</h2>
            <p>{m['bulin.steps.intro']()}</p>
          </div>
          <ol className="bulin-grid3">
            {steps.map((step, i) => (
              <li key={step.title} className="bulin-card">
                <span className="bulin-step-number" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <Meter />

        <section className="bulin-section" aria-labelledby="bulin-check-title">
          <div className="bulin-section-head">
            <h2 id="bulin-check-title">{m['bulin.check.title']()}</h2>
            <p>{m['bulin.check.intro']()}</p>
          </div>
          <div className="bulin-grid3">
            {checks.map((item) => (
              <article key={item.title} className="bulin-card">
                <Check size={18} aria-hidden />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="bulin-section bulin-faq"
          aria-labelledby="bulin-faq-title"
        >
          <h2 id="bulin-faq-title">{m['bulin.faq.title']()}</h2>
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

        <section className="bulin-cta" aria-labelledby="bulin-cta-title">
          <div className="bulin-cta-inner">
            <h2 id="bulin-cta-title">{m['bulin.cta.title']()}</h2>
            <p>{m['bulin.cta.body']()}</p>
            <a className="bulin-button" href="#bulin-studio">
              {m['bulin.hero.cta']()}
              <ArrowRight size={18} aria-hidden />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
