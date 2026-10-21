import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';

import { FLYING_CAR_THEMES } from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';
import { ThemeReelCard } from '@/components/theme-reel-card';

import '@/styles/flying-car-ai.css';

/** Side profile of the curved stunt ramp — the page's section divider. */
function RampLine() {
  return (
    <div className="fc-ramp-line" aria-hidden>
      <svg viewBox="0 0 1200 80" preserveAspectRatio="none">
        <path d="M0 78 H880 C1010 78 1080 52 1120 2" />
      </svg>
    </div>
  );
}

/** Seconds of the 14s sample where each beat of the stunt starts and ends. */
const BEATS = [
  { from: 0, to: 5 },
  { from: 5, to: 8 },
  { from: 8, to: 10 },
  { from: 10, to: 14.1 },
] as const;

/**
 * Hero visual: the minivan stunt on loop in a stunt-cam frame, with the four
 * beats as a timeline under it. The beat under the playhead lights up and
 * its bar fills; clicking a beat seeks the clip to it.
 */
function StuntCam() {
  const video = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const labels = [
    m['flycar.hero.beat_one'](),
    m['flycar.hero.beat_two'](),
    m['flycar.hero.beat_three'](),
    m['flycar.hero.beat_four'](),
  ];
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Phones hide the stunt cam, so only start playback where it is shown.
    if (!window.matchMedia('(min-width: 901px)').matches) return;
    let frame = 0;
    const tick = () => {
      setTime(el.currentTime);
      frame = requestAnimationFrame(tick);
    };
    // Play (and track the playhead) only while the clip is on screen.
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
  const active = Math.max(
    BEATS.findIndex((beat) => time < beat.to),
    0
  );
  const seek = (seconds: number) => {
    const el = video.current;
    if (!el) return;
    el.currentTime = seconds;
    setTime(seconds);
    void el.play().catch(() => {});
  };
  return (
    <div className="fc-cam" aria-hidden>
      <div className="fc-cam-screen">
        <video
          ref={video}
          src="/videos/flying-car/car.mp4"
          poster="/videos/flying-car/car.jpg"
          muted
          loop
          playsInline
          preload="none"
        />
        <span className="fc-cam-tag">{m['flycar.hero.replay']()}</span>
        <span className="fc-cam-clock">
          00:{String(Math.floor(time)).padStart(2, '0')}
        </span>
        <span className="fc-cam-corners" />
      </div>
      <ol className="fc-beats">
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
                <span className="fc-beat-bar">
                  <span style={{ transform: `scaleX(${progress})` }} />
                </span>
                <span className="fc-beat-time">
                  0:{String(beat.from).padStart(2, '0')}
                </span>
                <span className="fc-beat-label">{labels[i]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const SAMPLES = ['car', 'bicycle', 'carriage', 'skateboard'] as const;

export function FlyingCarAi() {
  const sampleTitles: Record<(typeof SAMPLES)[number], string> = {
    car: m['flycar.examples.car'](),
    bicycle: m['flycar.examples.bicycle'](),
    carriage: m['flycar.examples.carriage'](),
    skateboard: m['flycar.examples.skateboard'](),
  };
  const steps = [
    {
      title: m['flycar.steps.one.title'](),
      body: m['flycar.steps.one.body'](),
    },
    {
      title: m['flycar.steps.two.title'](),
      body: m['flycar.steps.two.body'](),
    },
    {
      title: m['flycar.steps.three.title'](),
      body: m['flycar.steps.three.body'](),
    },
  ];
  const checks = [
    {
      title: m['flycar.check.one.title'](),
      body: m['flycar.check.one.body'](),
    },
    {
      title: m['flycar.check.two.title'](),
      body: m['flycar.check.two.body'](),
    },
    {
      title: m['flycar.check.three.title'](),
      body: m['flycar.check.three.body'](),
    },
  ];
  const ideas = [
    {
      title: m['flycar.ideas.one.title'](),
      body: m['flycar.ideas.one.body'](),
    },
    {
      title: m['flycar.ideas.two.title'](),
      body: m['flycar.ideas.two.body'](),
    },
    {
      title: m['flycar.ideas.three.title'](),
      body: m['flycar.ideas.three.body'](),
    },
    {
      title: m['flycar.ideas.four.title'](),
      body: m['flycar.ideas.four.body'](),
    },
  ];
  const questions = [
    { q: m['flycar.faq.one.q'](), a: m['flycar.faq.one.a']() },
    { q: m['flycar.faq.two.q'](), a: m['flycar.faq.two.a']() },
    { q: m['flycar.faq.three.q'](), a: m['flycar.faq.three.a']() },
    { q: m['flycar.faq.four.q'](), a: m['flycar.faq.four.a']() },
    { q: m['flycar.faq.five.q'](), a: m['flycar.faq.five.a']() },
    { q: m['flycar.faq.six.q'](), a: m['flycar.faq.six.a']() },
  ];
  // Every sample runs the same ramp, so each card opens the one stunt.
  const pickStunt = () => {
    window.dispatchEvent(
      new CustomEvent('genjutsu:select-template', {
        detail: `flying-car-${FLYING_CAR_THEMES[0].slug}`,
      })
    );
    document
      .getElementById('fc-studio')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <>
      <Header />
      <main className="fc-page">
        <section className="fc-hero" aria-labelledby="fc-title">
          <div className="fc-hero-copy">
            <p className="fc-eyebrow">{m['flycar.eyebrow']()}</p>
            <h1 id="fc-title">
              {m['flycar.hero.title']()}{' '}
              <span>{m['flycar.hero.generator']()}</span>
            </h1>
            <p className="fc-intro">{m['flycar.hero.description']()}</p>
            <div className="fc-actions">
              <a href="#fc-studio" className="fc-button">
                {m['flycar.hero.cta']()}
                <ArrowRight size={18} aria-hidden />
              </a>
              <a href="#fc-how" className="fc-text-link">
                {m['flycar.hero.secondary']()}
                <ArrowDown size={15} aria-hidden />
              </a>
            </div>
            <ul className="fc-facts">
              {[
                m['flycar.strip.one'](),
                m['flycar.strip.two'](),
                m['flycar.strip.three'](),
              ].map((text) => (
                <li key={text}>
                  <Check size={14} aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <StuntCam />
        </section>

        <section
          id="fc-studio"
          className="fc-studio"
          aria-labelledby="fc-studio-title"
        >
          <div className="fc-studio-head">
            <h2 id="fc-studio-title">{m['flycar.studio.title']()}</h2>
            <p>{m['flycar.studio.description']()}</p>
          </div>
          <GenjutsuGenerator theme="flying-car" returnPath="/flying-car-ai" />
          <p className="fc-price">
            {m['flycar.price']({
              price: `$${(pricingCatalog.pack_starter.priceInCents / 100).toFixed(2)}`,
            })}
          </p>
        </section>

        <RampLine />

        <section
          id="fc-examples"
          className="fc-section"
          aria-labelledby="fc-examples-title"
        >
          <div className="fc-section-head">
            <h2 id="fc-examples-title">{m['flycar.examples.title']()}</h2>
            <p>{m['flycar.examples.description']()}</p>
          </div>
          <div className="fc-reel">
            {SAMPLES.map((slug, i) => (
              <ThemeReelCard
                key={slug}
                index={i + 1}
                src={`/videos/flying-car/${slug}.mp4`}
                poster={`/videos/flying-car/${slug}.jpg`}
                title={sampleTitles[slug]}
                actionLabel={m['flycar.examples.use']()}
                onAction={pickStunt}
              />
            ))}
          </div>
          <p className="fc-note">{m['flycar.examples.note']()}</p>
        </section>

        <section className="fc-about" aria-labelledby="fc-about-title">
          <div className="fc-section fc-about-grid">
            <div>
              <p className="fc-kicker">{m['flycar.about.kicker']()}</p>
              <h2 id="fc-about-title">{m['flycar.about.title']()}</h2>
              <p className="fc-about-line">{m['flycar.about.line']()}</p>
            </div>
            <div className="fc-prose">
              <p>{m['flycar.about.body']()}</p>
              <p>{m['flycar.about.more']()}</p>
              <p>{m['flycar.about.third']()}</p>
            </div>
          </div>
        </section>

        <section
          id="fc-how"
          className="fc-section"
          aria-labelledby="fc-how-title"
        >
          <div className="fc-section-head">
            <h2 id="fc-how-title">{m['flycar.steps.title']()}</h2>
            <p>{m['flycar.steps.intro']()}</p>
          </div>
          <ol className="fc-steps">
            {steps.map((step, i) => (
              <li key={step.title}>
                <span className="fc-step-number" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <RampLine />

        <section className="fc-section" aria-labelledby="fc-check-title">
          <div className="fc-section-head">
            <h2 id="fc-check-title">{m['flycar.check.title']()}</h2>
            <p>{m['flycar.check.intro']()}</p>
          </div>
          <div className="fc-checks">
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
          className="fc-section fc-ideas"
          aria-labelledby="fc-ideas-title"
        >
          <div className="fc-section-head">
            <h2 id="fc-ideas-title">{m['flycar.ideas.title']()}</h2>
            <p>{m['flycar.ideas.intro']()}</p>
          </div>
          <div className="fc-idea-grid">
            {ideas.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="fc-section fc-faq" aria-labelledby="fc-faq-title">
          <h2 id="fc-faq-title">{m['flycar.faq.title']()}</h2>
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

        <section className="fc-cta" aria-labelledby="fc-cta-title">
          <div className="fc-cta-inner">
            <h2 id="fc-cta-title">{m['flycar.cta.title']()}</h2>
            <p>{m['flycar.cta.body']()}</p>
            <a className="fc-button fc-button-light" href="#fc-studio">
              {m['flycar.hero.cta']()}
              <ArrowRight size={18} aria-hidden />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
