import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';

import { OZIL_THEMES } from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';
import { ThemeReelCard } from '@/components/theme-reel-card';

import '@/styles/ozil-ai.css';

/** Halfway line with a centre circle — the page's pitch motif. */
function Halfway() {
  return <div className="ozil-halfway" aria-hidden />;
}

/** Seconds of the 10s take where each beat of the move starts and ends. */
const BEATS = [
  { from: 0, to: 3 },
  { from: 3, to: 7 },
  { from: 7, to: 10 },
] as const;

/**
 * Hero visual: the goal take on loop, broadcast-replay style, beside the
 * three beats of the move. The beat under the playhead lights up and its
 * bar fills; clicking a beat seeks the replay to it.
 */
function ReplayConsole() {
  const video = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const labels = [
    m['ozil.hero.beat_one'](),
    m['ozil.hero.beat_two'](),
    m['ozil.hero.beat_three'](),
  ];
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Phones hide the console, so only start playback where it is shown.
    if (!window.matchMedia('(min-width: 900px)').matches) return;
    let frame = 0;
    const tick = () => {
      setTime(el.currentTime);
      frame = requestAnimationFrame(tick);
    };
    // Play (and track the playhead) only while the replay is on screen.
    const observer = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (entry.isIntersecting) {
        void el.play().catch(() => {});
        frame = requestAnimationFrame(tick);
      } else {
        el.pause();
      }
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  const active = BEATS.findIndex((beat) => time < beat.to);
  const seek = (seconds: number) => {
    const el = video.current;
    if (!el) return;
    el.currentTime = seconds;
    setTime(seconds);
    void el.play().catch(() => {});
  };
  return (
    <div className="ozil-replay" aria-hidden>
      <div className="ozil-replay-screen">
        <video
          ref={video}
          src="/videos/ozil/red-hoodie.mp4"
          poster="/videos/ozil/red-hoodie.jpg"
          muted
          loop
          playsInline
          preload="none"
        />
        <span className="ozil-replay-tag">{m['ozil.hero.replay']()}</span>
        <span className="ozil-replay-clock">
          00:{String(Math.floor(time)).padStart(2, '0')}
        </span>
        <span className="ozil-replay-caption">
          <span>{String(Math.max(active, 0) + 1).padStart(2, '0')}</span>
          {labels[Math.max(active, 0)]}
        </span>
      </div>
      <ol className="ozil-beats">
        {BEATS.map((beat, i) => {
          const progress = Math.min(
            1,
            Math.max(0, (time - beat.from) / (beat.to - beat.from))
          );
          return (
            <li key={beat.from} data-active={i === active || undefined}>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => seek(beat.from + 0.05)}
              >
                <span className="ozil-beat-time">
                  0:{String(beat.from).padStart(2, '0')}
                </span>
                <span className="ozil-beat-label">{labels[i]}</span>
                <span className="ozil-beat-bar">
                  <span style={{ transform: `scaleX(${progress})` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function OzilAi() {
  const takeTitles: Record<(typeof OZIL_THEMES)[number]['slug'], string> = {
    'red-hoodie': m['ozil.examples.red_hoodie'](),
    'five-a-side': m['ozil.examples.five_a_side'](),
    'office-shirt': m['ozil.examples.office_shirt'](),
  };
  const steps = [
    { title: m['ozil.steps.one.title'](), body: m['ozil.steps.one.body']() },
    { title: m['ozil.steps.two.title'](), body: m['ozil.steps.two.body']() },
    {
      title: m['ozil.steps.three.title'](),
      body: m['ozil.steps.three.body'](),
    },
  ];
  const checks = [
    { title: m['ozil.check.one.title'](), body: m['ozil.check.one.body']() },
    { title: m['ozil.check.two.title'](), body: m['ozil.check.two.body']() },
    {
      title: m['ozil.check.three.title'](),
      body: m['ozil.check.three.body'](),
    },
  ];
  const approaches = [
    {
      title: m['ozil.compare.template.title'](),
      body: m['ozil.compare.template.body'](),
    },
    {
      title: m['ozil.compare.prompt.title'](),
      body: m['ozil.compare.prompt.body'](),
    },
    {
      title: m['ozil.compare.recast.title'](),
      body: m['ozil.compare.recast.body'](),
      ours: true,
    },
  ];
  const questions = [
    { q: m['ozil.faq.one.q'](), a: m['ozil.faq.one.a']() },
    { q: m['ozil.faq.two.q'](), a: m['ozil.faq.two.a']() },
    { q: m['ozil.faq.three.q'](), a: m['ozil.faq.three.a']() },
    { q: m['ozil.faq.four.q'](), a: m['ozil.faq.four.a']() },
    { q: m['ozil.faq.five.q'](), a: m['ozil.faq.five.a']() },
    { q: m['ozil.faq.six.q'](), a: m['ozil.faq.six.a']() },
  ];
  const pickTake = (slug: string) => {
    window.dispatchEvent(
      new CustomEvent('genjutsu:select-template', { detail: `ozil-${slug}` })
    );
    document
      .getElementById('ozil-studio')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <>
      <Header />
      <main className="ozil-page">
        <section className="ozil-hero" aria-labelledby="ozil-title">
          <div className="ozil-hero-copy">
            <p className="ozil-eyebrow">{m['ozil.eyebrow']()}</p>
            <h1 id="ozil-title">
              {m['ozil.hero.title']()} <span>{m['ozil.hero.generator']()}</span>
            </h1>
            <p className="ozil-intro">{m['ozil.hero.description']()}</p>
            <div className="ozil-actions">
              <a href="#ozil-studio" className="ozil-button">
                {m['ozil.hero.cta']()}
                <ArrowRight size={18} aria-hidden />
              </a>
              <a href="#ozil-how" className="ozil-text-link">
                {m['ozil.hero.secondary']()}
                <ArrowDown size={15} aria-hidden />
              </a>
            </div>
            <ul className="ozil-facts">
              {[
                m['ozil.strip.one'](),
                m['ozil.strip.two'](),
                m['ozil.strip.three'](),
              ].map((text) => (
                <li key={text}>
                  <Check size={14} aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <ReplayConsole />
        </section>

        <section
          id="ozil-studio"
          className="ozil-studio"
          aria-labelledby="ozil-studio-title"
        >
          <div className="ozil-studio-head">
            <h2 id="ozil-studio-title">{m['ozil.studio.title']()}</h2>
            <p>{m['ozil.studio.description']()}</p>
          </div>
          <GenjutsuGenerator theme="ozil" returnPath="/ozil-ai" />
          <p className="ozil-price">
            {m['ozil.price']({
              price: `$${(pricingCatalog.pack_starter.priceInCents / 100).toFixed(2)}`,
            })}
          </p>
        </section>

        <Halfway />

        <section
          id="ozil-examples"
          className="ozil-section"
          aria-labelledby="ozil-examples-title"
        >
          <div className="ozil-section-head">
            <h2 id="ozil-examples-title">{m['ozil.examples.title']()}</h2>
            <p>{m['ozil.examples.description']()}</p>
          </div>
          <div className="ozil-reel">
            {OZIL_THEMES.map((take, i) => (
              <ThemeReelCard
                key={take.slug}
                index={i + 1}
                src={`/videos/ozil/${take.slug}.mp4`}
                poster={`/videos/ozil/${take.slug}.jpg`}
                title={takeTitles[take.slug]}
                actionLabel={m['ozil.examples.use']()}
                onAction={() => pickTake(take.slug)}
              />
            ))}
          </div>
          <p className="ozil-note">{m['ozil.examples.note']()}</p>
        </section>

        <section className="ozil-about" aria-labelledby="ozil-about-title">
          <div className="ozil-section ozil-about-grid">
            <div>
              <p className="ozil-kicker">{m['ozil.about.kicker']()}</p>
              <h2 id="ozil-about-title">{m['ozil.about.title']()}</h2>
              <p className="ozil-about-line">{m['ozil.about.line']()}</p>
            </div>
            <div className="ozil-prose">
              <p>{m['ozil.about.body']()}</p>
              <p>{m['ozil.about.more']()}</p>
            </div>
          </div>
        </section>

        <section
          id="ozil-how"
          className="ozil-section"
          aria-labelledby="ozil-how-title"
        >
          <div className="ozil-section-head">
            <h2 id="ozil-how-title">{m['ozil.steps.title']()}</h2>
            <p>{m['ozil.steps.intro']()}</p>
          </div>
          <ol className="ozil-steps">
            {steps.map((step, i) => (
              <li key={step.title}>
                <span className="ozil-step-number" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <Halfway />

        <section className="ozil-section" aria-labelledby="ozil-check-title">
          <div className="ozil-section-head">
            <h2 id="ozil-check-title">{m['ozil.check.title']()}</h2>
            <p>{m['ozil.check.intro']()}</p>
          </div>
          <div className="ozil-checks">
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
          className="ozil-section ozil-compare"
          aria-labelledby="ozil-compare-title"
        >
          <div className="ozil-section-head">
            <h2 id="ozil-compare-title">{m['ozil.compare.title']()}</h2>
            <p>{m['ozil.compare.intro']()}</p>
          </div>
          <div className="ozil-approaches">
            {approaches.map((item) => (
              <article key={item.title} data-ours={item.ours || undefined}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="ozil-section ozil-faq"
          aria-labelledby="ozil-faq-title"
        >
          <h2 id="ozil-faq-title">{m['ozil.faq.title']()}</h2>
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

        <section className="ozil-cta" aria-labelledby="ozil-cta-title">
          <div className="ozil-cta-inner">
            <h2 id="ozil-cta-title">{m['ozil.cta.title']()}</h2>
            <p>{m['ozil.cta.body']()}</p>
            <a className="ozil-button ozil-button-light" href="#ozil-studio">
              {m['ozil.hero.cta']()}
              <ArrowRight size={18} aria-hidden />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
