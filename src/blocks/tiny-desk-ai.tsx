import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';

import { TINY_DESK_THEMES } from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';
import { PageBreadcrumbs } from '@/blocks/page-breadcrumbs';
import { RelatedTrends } from '@/blocks/related-trends';
import { ThemeReelCard } from '@/components/theme-reel-card';

import '@/styles/tiny-desk-ai.css';

/** A row of VU meter bars bouncing between sections — the page's motif. */
function Meter() {
  return (
    <div className="desk-meter" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} />
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
    <div className="desk-stage" aria-hidden>
      <video
        ref={video}
        src="/videos/tiny-desk/band.mp4"
        poster="/videos/tiny-desk/band.jpg"
        muted
        loop
        playsInline
        preload="none"
      />
      <span className="desk-tag">{m['tinydesk.hero.tag']()}</span>
      <span className="desk-chant">{m['tinydesk.hero.stamp']()}</span>
    </div>
  );
}

export function TinyDeskAi() {
  const takeTitles: Record<(typeof TINY_DESK_THEMES)[number]['slug'], string> =
    {
      band: m['tinydesk.examples.band'](),
      laugh: m['tinydesk.examples.laugh'](),
      sax: m['tinydesk.examples.sax'](),
      finale: m['tinydesk.examples.finale'](),
    };
  const steps = [
    {
      title: m['tinydesk.steps.one.title'](),
      body: m['tinydesk.steps.one.body'](),
    },
    {
      title: m['tinydesk.steps.two.title'](),
      body: m['tinydesk.steps.two.body'](),
    },
    {
      title: m['tinydesk.steps.three.title'](),
      body: m['tinydesk.steps.three.body'](),
    },
  ];
  const checks = [
    {
      title: m['tinydesk.check.one.title'](),
      body: m['tinydesk.check.one.body'](),
    },
    {
      title: m['tinydesk.check.two.title'](),
      body: m['tinydesk.check.two.body'](),
    },
    {
      title: m['tinydesk.check.three.title'](),
      body: m['tinydesk.check.three.body'](),
    },
  ];
  const questions = [
    { q: m['tinydesk.faq.one.q'](), a: m['tinydesk.faq.one.a']() },
    { q: m['tinydesk.faq.two.q'](), a: m['tinydesk.faq.two.a']() },
    { q: m['tinydesk.faq.three.q'](), a: m['tinydesk.faq.three.a']() },
    { q: m['tinydesk.faq.four.q'](), a: m['tinydesk.faq.four.a']() },
    { q: m['tinydesk.faq.five.q'](), a: m['tinydesk.faq.five.a']() },
    { q: m['tinydesk.faq.six.q'](), a: m['tinydesk.faq.six.a']() },
  ];
  const pickTake = (slug: string) => {
    window.dispatchEvent(
      new CustomEvent('genjutsu:select-template', {
        detail: `tinydesk-${slug}`,
      })
    );
    document
      .getElementById('desk-studio')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <>
      <Header />
      <main className="desk-page">
        <section className="desk-hero" aria-labelledby="desk-title">
          <div>
            <PageBreadcrumbs
              currentPage={m['tinydesk.nav']()}
              className="mb-6"
            />
            <p className="desk-eyebrow">{m['tinydesk.eyebrow']()}</p>
            <h1 id="desk-title">
              {m['tinydesk.hero.title']()}{' '}
              <span>{m['tinydesk.hero.generator']()}</span>
            </h1>
            <p className="desk-intro">
              <span className="desk-long">
                {m['tinydesk.hero.description']()}
              </span>
              <span className="desk-short">
                {m['tinydesk.hero.description_short']()}
              </span>
            </p>
            <div className="desk-actions">
              <a href="#desk-studio" className="desk-button">
                {m['tinydesk.hero.cta']()}
                <ArrowRight size={18} aria-hidden />
              </a>
              <a href="#desk-how" className="desk-text-link">
                {m['tinydesk.hero.secondary']()}
                <ArrowDown size={15} aria-hidden />
              </a>
            </div>
            <ul className="desk-facts">
              {[
                m['tinydesk.strip.one'](),
                m['tinydesk.strip.two'](),
                m['tinydesk.strip.three'](),
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
          id="desk-studio"
          className="desk-studio"
          aria-labelledby="desk-studio-title"
        >
          <div className="desk-section-head desk-studio-head">
            <h2 id="desk-studio-title">{m['tinydesk.studio.title']()}</h2>
            <p>{m['tinydesk.studio.description']()}</p>
          </div>
          <GenjutsuGenerator theme="tinydesk" returnPath="/tiny-desk-ai" />
          <p className="desk-price">
            {m['tinydesk.price']({
              price: `$${(pricingCatalog.pack_starter.priceInCents / 100).toFixed(2)}`,
            })}
          </p>
        </section>

        <Meter />

        <section
          id="desk-examples"
          className="desk-section"
          aria-labelledby="desk-examples-title"
        >
          <div className="desk-section-head">
            <h2 id="desk-examples-title">{m['tinydesk.examples.title']()}</h2>
            <p>{m['tinydesk.examples.description']()}</p>
          </div>
          <div className="desk-reel">
            {TINY_DESK_THEMES.map((take, i) => (
              <ThemeReelCard
                key={take.slug}
                index={i + 1}
                src={`/videos/tiny-desk/${take.slug}.mp4`}
                poster={`/videos/tiny-desk/${take.slug}.jpg`}
                title={takeTitles[take.slug]}
                actionLabel={m['tinydesk.examples.use']()}
                onAction={() => pickTake(take.slug)}
              />
            ))}
          </div>
          <p className="desk-note">{m['tinydesk.examples.note']()}</p>
        </section>

        <section className="desk-about" aria-labelledby="desk-about-title">
          <div className="desk-section desk-about-grid">
            <div>
              <p className="desk-kicker">{m['tinydesk.about.kicker']()}</p>
              <h2 id="desk-about-title">{m['tinydesk.about.title']()}</h2>
              <p className="desk-about-line">{m['tinydesk.about.line']()}</p>
            </div>
            <div className="desk-prose">
              <p>{m['tinydesk.about.body']()}</p>
              <p>{m['tinydesk.about.more']()}</p>
            </div>
          </div>
        </section>

        <section
          id="desk-how"
          className="desk-section"
          aria-labelledby="desk-how-title"
        >
          <div className="desk-section-head">
            <h2 id="desk-how-title">{m['tinydesk.steps.title']()}</h2>
            <p>{m['tinydesk.steps.intro']()}</p>
          </div>
          <ol className="desk-grid3">
            {steps.map((step, i) => (
              <li key={step.title} className="desk-card">
                <span className="desk-step-number" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <Meter />

        <section className="desk-section" aria-labelledby="desk-check-title">
          <div className="desk-section-head">
            <h2 id="desk-check-title">{m['tinydesk.check.title']()}</h2>
            <p>{m['tinydesk.check.intro']()}</p>
          </div>
          <div className="desk-grid3">
            {checks.map((item) => (
              <article key={item.title} className="desk-card">
                <Check size={18} aria-hidden />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="desk-section desk-faq"
          aria-labelledby="desk-faq-title"
        >
          <h2 id="desk-faq-title">{m['tinydesk.faq.title']()}</h2>
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

        <section className="desk-cta" aria-labelledby="desk-cta-title">
          <div className="desk-cta-inner">
            <h2 id="desk-cta-title">{m['tinydesk.cta.title']()}</h2>
            <p>{m['tinydesk.cta.body']()}</p>
            <a className="desk-button" href="#desk-studio">
              {m['tinydesk.hero.cta']()}
              <ArrowRight size={18} aria-hidden />
            </a>
          </div>
        </section>
      </main>
      <RelatedTrends currentSlug="tiny-desk-ai" />
      <Footer />
    </>
  );
}
