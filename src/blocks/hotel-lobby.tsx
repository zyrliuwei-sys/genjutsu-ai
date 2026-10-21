import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';

import {
  DEFAULT_DUET_SCENE,
  DUET_SCENES,
  type DuetScene,
} from '@/config/hotel-lobby-scenes';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { HotelLobbyStudio } from '@/blocks/hotel-lobby-studio';
import { ThemeReelCard } from '@/components/theme-reel-card';

import '@/styles/hotel-lobby.css';

const SCENES = Object.keys(DUET_SCENES) as DuetScene[];

/** A mic hanging on its cable between sections — the page's motif. */
function HangingMic() {
  return <div className="hl-mic-divider" aria-hidden />;
}

/**
 * Hero visual: the booth monitor. Plays one example duet and lets the
 * visitor flip between the four scenes the generator offers.
 */
function BoothMonitor({ names }: { names: Record<DuetScene, string> }) {
  const video = useRef<HTMLVideoElement>(null);
  const [scene, setScene] = useState<DuetScene>(DEFAULT_DUET_SCENE);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Phones hide the monitor; the generator preview right below plays instead.
    if (!window.matchMedia('(min-width: 900px)').matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void el.play().catch(() => {});
      else el.pause();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [scene]);
  return (
    <div className="hl-monitor">
      <div className="hl-monitor-screen">
        <video
          ref={video}
          key={scene}
          src={`/videos/hotel-lobby/${scene}.mp4`}
          poster={`/videos/hotel-lobby/${scene}.jpg`}
          aria-label={names[scene]}
          muted
          loop
          playsInline
          preload="none"
        />
        <span className="hl-monitor-tag">{m['hotel.hero.on_air']()}</span>
      </div>
      <div className="hl-monitor-scenes" role="group">
        {SCENES.map((key, i) => (
          <button
            key={key}
            type="button"
            aria-pressed={scene === key}
            onClick={() => setScene(key)}
          >
            <span className="hl-monitor-index">
              {String(i + 1).padStart(2, '0')}
            </span>
            {names[key]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HotelLobby() {
  const [scene, setScene] = useState<DuetScene>(DEFAULT_DUET_SCENE);
  const sceneNames: Record<DuetScene, string> = {
    'orange-studio': m['hotel.scenes.orange_studio'](),
    'hotel-lobby': m['hotel.scenes.hotel_lobby'](),
    'night-street': m['hotel.scenes.night_street'](),
    'neon-studio': m['hotel.scenes.neon_studio'](),
  };
  const exampleTitles: Record<DuetScene, string> = {
    'orange-studio': m['hotel.examples.friends'](),
    'hotel-lobby': m['hotel.examples.couple'](),
    'night-street': m['hotel.examples.grandpas'](),
    'neon-studio': m['hotel.examples.roast'](),
  };
  const steps = [
    { title: m['hotel.steps.one.title'](), body: m['hotel.steps.one.body']() },
    { title: m['hotel.steps.two.title'](), body: m['hotel.steps.two.body']() },
    {
      title: m['hotel.steps.three.title'](),
      body: m['hotel.steps.three.body'](),
    },
  ];
  const tips = [
    { title: m['hotel.tips.one.title'](), body: m['hotel.tips.one.body']() },
    { title: m['hotel.tips.two.title'](), body: m['hotel.tips.two.body']() },
    {
      title: m['hotel.tips.three.title'](),
      body: m['hotel.tips.three.body'](),
    },
  ];
  const ideas = [
    { title: m['hotel.ideas.one.title'](), body: m['hotel.ideas.one.body']() },
    { title: m['hotel.ideas.two.title'](), body: m['hotel.ideas.two.body']() },
    {
      title: m['hotel.ideas.three.title'](),
      body: m['hotel.ideas.three.body'](),
    },
  ];
  const questions = [
    { q: m['hotel.faq.one.q'](), a: m['hotel.faq.one.a']() },
    { q: m['hotel.faq.two.q'](), a: m['hotel.faq.two.a']() },
    { q: m['hotel.faq.three.q'](), a: m['hotel.faq.three.a']() },
    { q: m['hotel.faq.four.q'](), a: m['hotel.faq.four.a']() },
    { q: m['hotel.faq.five.q'](), a: m['hotel.faq.five.a']() },
    { q: m['hotel.faq.six.q'](), a: m['hotel.faq.six.a']() },
  ];
  const pickScene = (key: DuetScene) => {
    setScene(key);
    document
      .getElementById('hl-studio')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <>
      <Header />
      <main className="hl-page">
        <section className="hl-hero" aria-labelledby="hl-title">
          <div className="hl-hero-copy">
            <p className="hl-eyebrow">{m['hotel.eyebrow']()}</p>
            <h1 id="hl-title">
              {m['hotel.hero.title']()}{' '}
              <span>{m['hotel.hero.generator']()}</span>
            </h1>
            <p className="hl-intro">{m['hotel.hero.description']()}</p>
            <div className="hl-actions">
              <a href="#hl-studio" className="hl-button">
                {m['hotel.hero.cta']()}
                <ArrowRight size={18} aria-hidden />
              </a>
              <a href="#hl-how" className="hl-text-link">
                {m['hotel.hero.secondary']()}
                <ArrowDown size={15} aria-hidden />
              </a>
            </div>
            <ul className="hl-facts">
              {[
                m['hotel.strip.one'](),
                m['hotel.strip.two'](),
                m['hotel.strip.three'](),
              ].map((text) => (
                <li key={text}>
                  <Check size={14} aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <BoothMonitor names={sceneNames} />
        </section>

        <section
          id="hl-studio"
          className="hl-studio"
          aria-labelledby="hl-studio-title"
        >
          <div className="hl-studio-head">
            <h2 id="hl-studio-title">{m['hotel.studio.title']()}</h2>
            <p>{m['hotel.studio.description']()}</p>
          </div>
          <HotelLobbyStudio scene={scene} onSceneChange={setScene} />
        </section>

        <HangingMic />

        <section
          id="hl-examples"
          className="hl-section"
          aria-labelledby="hl-examples-title"
        >
          <div className="hl-section-head">
            <h2 id="hl-examples-title">{m['hotel.examples.title']()}</h2>
            <p>{m['hotel.examples.description']()}</p>
          </div>
          <div className="hl-reel">
            {SCENES.map((key, i) => (
              <ThemeReelCard
                key={key}
                index={i + 1}
                src={`/videos/hotel-lobby/${key}.mp4`}
                poster={`/videos/hotel-lobby/${key}.jpg`}
                title={exampleTitles[key]}
                actionLabel={m['hotel.examples.use']()}
                onAction={() => pickScene(key)}
              />
            ))}
          </div>
          <p className="hl-note">{m['hotel.examples.note']()}</p>
        </section>

        <section className="hl-about" aria-labelledby="hl-about-title">
          <div className="hl-section hl-about-grid">
            <div>
              <p className="hl-kicker">{m['hotel.about.kicker']()}</p>
              <h2 id="hl-about-title">{m['hotel.about.title']()}</h2>
              <p className="hl-about-line">{m['hotel.about.line']()}</p>
            </div>
            <div className="hl-prose">
              <p>{m['hotel.about.body']()}</p>
              <p>{m['hotel.about.more']()}</p>
              <p>{m['hotel.about.why']()}</p>
            </div>
          </div>
        </section>

        <section
          id="hl-how"
          className="hl-section"
          aria-labelledby="hl-how-title"
        >
          <div className="hl-section-head">
            <h2 id="hl-how-title">{m['hotel.steps.title']()}</h2>
            <p>{m['hotel.steps.intro']()}</p>
          </div>
          <ol className="hl-steps">
            {steps.map((step, i) => (
              <li key={step.title}>
                <span className="hl-step-number" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <HangingMic />

        <section className="hl-section" aria-labelledby="hl-tips-title">
          <div className="hl-section-head">
            <h2 id="hl-tips-title">{m['hotel.tips.title']()}</h2>
            <p>{m['hotel.tips.intro']()}</p>
          </div>
          <div className="hl-tips">
            {tips.map((item) => (
              <article key={item.title}>
                <Check size={18} aria-hidden />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="hl-section hl-ideas"
          aria-labelledby="hl-ideas-title"
        >
          <div className="hl-section-head">
            <h2 id="hl-ideas-title">{m['hotel.ideas.title']()}</h2>
            <p>{m['hotel.ideas.intro']()}</p>
          </div>
          <div className="hl-idea-grid">
            {ideas.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="hl-section hl-faq" aria-labelledby="hl-faq-title">
          <h2 id="hl-faq-title">{m['hotel.faq.title']()}</h2>
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

        <section className="hl-cta" aria-labelledby="hl-cta-title">
          <div className="hl-cta-inner">
            <h2 id="hl-cta-title">{m['hotel.cta.title']()}</h2>
            <p>{m['hotel.cta.body']()}</p>
            <a className="hl-button hl-button-light" href="#hl-studio">
              {m['hotel.hero.cta']()}
              <ArrowRight size={18} aria-hidden />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
