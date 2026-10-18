import { ArrowDown, ArrowRight, Check } from 'lucide-react';

import { CRAZY_FROG_THEMES } from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';
import { ThemeReelCard } from '@/components/theme-reel-card';

import '@/styles/crazy-frog.css';

/** Dashed lane marking that runs between sections — the page's road motif. */
function Lane() {
  return <div className="frog-lane" aria-hidden />;
}

export function CrazyFrog() {
  const themeTitles: Record<
    (typeof CRAZY_FROG_THEMES)[number]['slug'],
    string
  > = {
    overpass: m['frog.examples.overpass'](),
    'neon-city': m['frog.examples.neon'](),
    chocolate: m['frog.examples.chocolate'](),
    'pixel-world': m['frog.examples.pixel'](),
    'circuit-board': m['frog.examples.circuit'](),
    halloween: m['frog.examples.halloween'](),
  };
  const steps = [
    { title: m['frog.steps.one.title'](), body: m['frog.steps.one.body']() },
    { title: m['frog.steps.two.title'](), body: m['frog.steps.two.body']() },
    {
      title: m['frog.steps.three.title'](),
      body: m['frog.steps.three.body'](),
    },
  ];
  const checks = [
    { title: m['frog.check.one.title'](), body: m['frog.check.one.body']() },
    { title: m['frog.check.two.title'](), body: m['frog.check.two.body']() },
    {
      title: m['frog.check.three.title'](),
      body: m['frog.check.three.body'](),
    },
  ];
  const questions = [
    { q: m['frog.faq.one.q'](), a: m['frog.faq.one.a']() },
    { q: m['frog.faq.two.q'](), a: m['frog.faq.two.a']() },
    { q: m['frog.faq.three.q'](), a: m['frog.faq.three.a']() },
    { q: m['frog.faq.four.q'](), a: m['frog.faq.four.a']() },
    { q: m['frog.faq.five.q'](), a: m['frog.faq.five.a']() },
    { q: m['frog.faq.six.q'](), a: m['frog.faq.six.a']() },
  ];
  const pickTheme = (slug: string) => {
    window.dispatchEvent(
      new CustomEvent('genjutsu:select-template', {
        detail: `crazy-frog-${slug}`,
      })
    );
    document
      .getElementById('frog-studio')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <>
      <Header />
      <main className="frog-page">
        <section className="frog-hero" aria-labelledby="frog-title">
          <p className="frog-eyebrow">{m['frog.eyebrow']()}</p>
          <h1 id="frog-title">
            {m['frog.hero.title']()} <span>{m['frog.hero.generator']()}</span>
          </h1>
          <p className="frog-hero-line">{m['frog.hero.line']()}</p>
          <p className="frog-intro">{m['frog.hero.description']()}</p>
          <div className="frog-actions">
            <a href="#frog-studio" className="frog-button">
              {m['frog.hero.cta']()}
              <ArrowRight size={18} aria-hidden />
            </a>
            <a href="#frog-how" className="frog-text-link">
              {m['frog.hero.secondary']()}
              <ArrowDown size={15} aria-hidden />
            </a>
          </div>
          <ul className="frog-chips">
            {[
              m['frog.strip.one'](),
              m['frog.strip.two'](),
              m['frog.strip.three'](),
            ].map((text) => (
              <li key={text}>
                <Check size={14} aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </section>

        <section
          id="frog-studio"
          className="frog-studio"
          aria-labelledby="frog-studio-title"
        >
          <div className="frog-studio-head">
            <h2 id="frog-studio-title">{m['frog.studio.title']()}</h2>
            <p>{m['frog.studio.description']()}</p>
          </div>
          <GenjutsuGenerator theme="crazy-frog" returnPath="/crazy-frog-ai" />
          <p className="frog-price">
            {m['frog.price']({
              price: `$${(pricingCatalog.pack_starter.priceInCents / 100).toFixed(2)}`,
            })}
          </p>
        </section>

        <Lane />

        <section
          id="frog-examples"
          className="frog-section"
          aria-labelledby="frog-examples-title"
        >
          <div className="frog-section-head">
            <h2 id="frog-examples-title">{m['frog.examples.title']()}</h2>
            <p>{m['frog.examples.description']()}</p>
          </div>
          <div className="frog-reel">
            {CRAZY_FROG_THEMES.map((theme, i) => (
              <ThemeReelCard
                key={theme.slug}
                featured={i === 0}
                index={i + 1}
                src={`/videos/crazy-frog/${theme.slug}.mp4?v=url-repair-2`}
                poster={`/videos/crazy-frog/${theme.slug}.jpg?v=url-repair-2`}
                title={themeTitles[theme.slug]}
                actionLabel={m['frog.examples.use']()}
                onAction={() => pickTheme(theme.slug)}
              />
            ))}
          </div>
          <p className="frog-note">{m['frog.examples.note']()}</p>
        </section>

        <section className="frog-about" aria-labelledby="frog-about-title">
          <div className="frog-section frog-about-grid">
            <div>
              <p className="frog-kicker">{m['frog.about.kicker']()}</p>
              <h2 id="frog-about-title">{m['frog.about.title']()}</h2>
              <p className="frog-about-line" aria-hidden>
                {m['frog.hero.line']()}
              </p>
            </div>
            <div className="frog-prose">
              <p>{m['frog.about.body']()}</p>
              <p>{m['frog.about.more']()}</p>
            </div>
          </div>
        </section>

        <section
          id="frog-how"
          className="frog-section"
          aria-labelledby="frog-how-title"
        >
          <div className="frog-section-head">
            <h2 id="frog-how-title">{m['frog.steps.title']()}</h2>
            <p>{m['frog.steps.intro']()}</p>
          </div>
          <ol className="frog-steps">
            {steps.map((step, i) => (
              <li key={step.title}>
                <span className="frog-step-number" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <Lane />

        <section className="frog-section" aria-labelledby="frog-check-title">
          <div className="frog-section-head">
            <h2 id="frog-check-title">{m['frog.check.title']()}</h2>
            <p>{m['frog.check.intro']()}</p>
          </div>
          <div className="frog-checks">
            {checks.map((item) => (
              <article key={item.title}>
                <Check size={18} aria-hidden />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="frog-section frog-faq"
          aria-labelledby="frog-faq-title"
        >
          <h2 id="frog-faq-title">{m['frog.faq.title']()}</h2>
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

        <section className="frog-cta" aria-labelledby="frog-cta-title">
          <div className="frog-cta-inner">
            <h2 id="frog-cta-title">{m['frog.cta.title']()}</h2>
            <p>{m['frog.cta.body']()}</p>
            <a className="frog-button frog-button-light" href="#frog-studio">
              {m['frog.hero.cta']()}
              <ArrowRight size={18} aria-hidden />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
