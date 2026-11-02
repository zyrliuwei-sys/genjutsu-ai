import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';

import { DIME_DIME_BABY_THEMES } from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';
import { ThemeReelCard } from '@/components/theme-reel-card';

import '@/styles/dime-dime-baby-ai.css';

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
    <div className="dime-stage" aria-hidden>
      <video
        ref={video}
        src="/videos/dime-dime-baby/black-shirt.mp4"
        poster="/videos/dime-dime-baby/black-shirt.jpg"
        muted
        loop
        playsInline
        preload="none"
      />
      <span className="dime-tag">{m['dime.hero.tag']()}</span>
    </div>
  );
}

export function DimeDimeBabyAi() {
  const takeTitles: Record<
    (typeof DIME_DIME_BABY_THEMES)[number]['slug'],
    string
  > = {
    'black-shirt': m['dime.examples.black_shirt'](),
    'navy-shirt': m['dime.examples.navy_shirt'](),
    suit: m['dime.examples.suit'](),
  };
  const steps = [
    {
      title: m['dime.steps.one.title'](),
      body: m['dime.steps.one.body'](),
    },
    {
      title: m['dime.steps.two.title'](),
      body: m['dime.steps.two.body'](),
    },
    {
      title: m['dime.steps.three.title'](),
      body: m['dime.steps.three.body'](),
    },
  ];
  const checks = [
    {
      title: m['dime.check.one.title'](),
      body: m['dime.check.one.body'](),
    },
    {
      title: m['dime.check.two.title'](),
      body: m['dime.check.two.body'](),
    },
    {
      title: m['dime.check.three.title'](),
      body: m['dime.check.three.body'](),
    },
  ];
  const questions = [
    { q: m['dime.faq.one.q'](), a: m['dime.faq.one.a']() },
    { q: m['dime.faq.two.q'](), a: m['dime.faq.two.a']() },
    { q: m['dime.faq.three.q'](), a: m['dime.faq.three.a']() },
    { q: m['dime.faq.four.q'](), a: m['dime.faq.four.a']() },
    { q: m['dime.faq.five.q'](), a: m['dime.faq.five.a']() },
    { q: m['dime.faq.six.q'](), a: m['dime.faq.six.a']() },
  ];
  const pickTake = (slug: string) => {
    window.dispatchEvent(
      new CustomEvent('genjutsu:select-template', { detail: `dime-${slug}` })
    );
    document.getElementById('dime-studio')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    });
  };
  return (
    <>
      <Header />
      <main className="dime-page">
        <section className="dime-hero" aria-labelledby="dime-title">
          <div>
            <p className="dime-eyebrow">{m['dime.eyebrow']()}</p>
            <h1 id="dime-title">
              {m['dime.hero.title']()} <span>{m['dime.hero.generator']()}</span>
            </h1>
            <p className="dime-intro">
              <span className="dime-long">{m['dime.hero.description']()}</span>
              <span className="dime-short">
                {m['dime.hero.description_short']()}
              </span>
            </p>
            <div className="dime-actions">
              <a href="#dime-studio" className="dime-button">
                {m['dime.hero.cta']()}
                <ArrowRight size={18} aria-hidden />
              </a>
              <a href="#dime-how" className="dime-text-link">
                {m['dime.hero.secondary']()}
                <ArrowDown size={15} aria-hidden />
              </a>
            </div>
            <ul className="dime-facts">
              {[
                m['dime.strip.one'](),
                m['dime.strip.two'](),
                m['dime.strip.three'](),
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
          id="dime-studio"
          className="dime-studio"
          aria-labelledby="dime-studio-title"
        >
          <div className="dime-section-head dime-studio-head">
            <h2 id="dime-studio-title">{m['dime.studio.title']()}</h2>
            <p>{m['dime.studio.description']()}</p>
          </div>
          <GenjutsuGenerator theme="dime" returnPath="/dime-dime-baby-ai" />
          <p className="dime-price">
            {m['dime.price']({
              price: `$${(pricingCatalog.pack_starter.priceInCents / 100).toFixed(2)}`,
            })}
          </p>
        </section>

        <section
          id="dime-examples"
          className="dime-section"
          aria-labelledby="dime-examples-title"
        >
          <div className="dime-section-head">
            <h2 id="dime-examples-title">{m['dime.examples.title']()}</h2>
            <p>{m['dime.examples.description']()}</p>
          </div>
          <div className="dime-reel">
            {DIME_DIME_BABY_THEMES.map((take, i) => (
              <ThemeReelCard
                key={take.slug}
                index={i + 1}
                src={`/videos/dime-dime-baby/${take.slug}.mp4`}
                poster={`/videos/dime-dime-baby/${take.slug}.jpg`}
                title={takeTitles[take.slug]}
                actionLabel={m['dime.examples.use']()}
                onAction={() => pickTake(take.slug)}
              />
            ))}
          </div>
          <p className="dime-note">
            {m['dime.examples.note']()}{' '}
            <a
              href="https://noiz.ai/lp/dime-dime-baby"
              target="_blank"
              rel="noopener noreferrer"
            >
              Noiz
            </a>
            {' · '}
            <a
              href="https://www.media.io/ai/zh/explore/zone/dime-dime-baby-ai-video-generator"
              target="_blank"
              rel="noopener noreferrer"
            >
              Media.io
            </a>
          </p>
        </section>

        <section className="dime-about" aria-labelledby="dime-about-title">
          <div className="dime-section dime-about-grid">
            <div>
              <p className="dime-kicker">{m['dime.about.kicker']()}</p>
              <h2 id="dime-about-title">{m['dime.about.title']()}</h2>
              <p className="dime-about-line">{m['dime.about.line']()}</p>
            </div>
            <div className="dime-prose">
              <p>{m['dime.about.body']()}</p>
              <p>{m['dime.about.more']()}</p>
            </div>
          </div>
        </section>

        <section
          id="dime-how"
          className="dime-section"
          aria-labelledby="dime-how-title"
        >
          <div className="dime-section-head">
            <h2 id="dime-how-title">{m['dime.steps.title']()}</h2>
            <p>{m['dime.steps.intro']()}</p>
          </div>
          <ol className="dime-grid3">
            {steps.map((step, i) => (
              <li key={step.title} className="dime-card">
                <span className="dime-step-number" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="dime-section" aria-labelledby="dime-check-title">
          <div className="dime-section-head">
            <h2 id="dime-check-title">{m['dime.check.title']()}</h2>
            <p>{m['dime.check.intro']()}</p>
          </div>
          <div className="dime-grid3">
            {checks.map((item) => (
              <article key={item.title} className="dime-card">
                <Check size={18} aria-hidden />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="dime-section dime-faq"
          aria-labelledby="dime-faq-title"
        >
          <h2 id="dime-faq-title">{m['dime.faq.title']()}</h2>
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

        <section className="dime-cta" aria-labelledby="dime-cta-title">
          <div className="dime-cta-inner">
            <h2 id="dime-cta-title">{m['dime.cta.title']()}</h2>
            <p>{m['dime.cta.body']()}</p>
            <a className="dime-button" href="#dime-studio">
              {m['dime.hero.cta']()}
              <ArrowRight size={18} aria-hidden />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
