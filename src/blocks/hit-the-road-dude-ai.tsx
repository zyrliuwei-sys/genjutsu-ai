import {
  ArrowDown,
  ArrowRight,
  CornerDownRight,
  ExternalLink,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { HIT_THE_ROAD_THEMES } from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';
import { PageBreadcrumbs } from '@/blocks/page-breadcrumbs';
import { RelatedTrends } from '@/blocks/related-trends';

import '@fontsource/bebas-neue/latin-400.css';
import '@/styles/hit-the-road-dude-ai.css';

const source =
  'https://www.media.io/ai/zh/explore/zone/hit-the-road-dude-ai-video';

export function HitTheRoadDudeAi() {
  const names = [
    m['road.examples.pickup'](),
    m['road.examples.cat'](),
    m['road.examples.dog'](),
  ];
  const captions = [
    m['road.examples.pickup_body'](),
    m['road.examples.cat_body'](),
    m['road.examples.dog_body'](),
  ];
  const beats = (['one', 'two', 'three'] as const).map((n) => ({
    title: m[`road.beats.${n}.title`](),
    body: m[`road.beats.${n}.body`](),
  }));
  const steps = (['one', 'two', 'three'] as const).map((n) => ({
    title: m[`road.steps.${n}.title`](),
    body: m[`road.steps.${n}.body`](),
  }));
  const fixes = (['one', 'two', 'three'] as const).map((n) => ({
    title: m[`road.fixes.${n}.title`](),
    body: m[`road.fixes.${n}.body`](),
  }));
  const faq = (['one', 'two', 'three', 'four', 'five', 'six'] as const).map(
    (n) => ({
      q: m[`road.faq.${n}.q`](),
      a: m[`road.faq.${n}.a`](),
    })
  );
  const choose = (slug: string) => {
    window.dispatchEvent(
      new CustomEvent('genjutsu:select-template', { detail: `road-${slug}` })
    );
    document.getElementById('road-studio')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    });
  };
  return (
    <>
      <Header />
      <main className="road-page">
        <section className="road-hero road-wrap" aria-labelledby="road-title">
          <div className="road-hero-copy">
            <PageBreadcrumbs
              currentPage={m['road.nav']()}
              className="mb-7 md:mb-10"
            />
            <p className="road-eyebrow">
              <span aria-hidden />
              {m['road.eyebrow']()}
            </p>
            <h1 id="road-title">
              Hit the Road <br />
              <span>Dude AI</span>
            </h1>
            <p className="road-deck">{m['road.hero.description']()}</p>
            <div className="road-actions">
              <a className="road-button" href="#road-studio">
                {m['road.hero.cta']()}
                <ArrowRight size={18} aria-hidden />
              </a>
              <a className="road-text-link" href="#road-examples">
                {m['road.hero.examples']()}
                <ArrowDown size={16} aria-hidden />
              </a>
            </div>
            <p className="road-price">
              {m['road.price']({
                price: `$${(pricingCatalog.pack_starter.priceInCents / 100).toFixed(2)}`,
              })}
            </p>
          </div>
          <figure className="road-hero-film">
            <div className="road-film-label">
              <span>{m['road.hero.scene']()}</span>
              <span aria-hidden>01 / 03</span>
            </div>
            <video
              controls
              playsInline
              preload="none"
              poster="/videos/hit-the-road-dude/dog.jpg"
              src="/videos/hit-the-road-dude/dog.mp4"
              aria-label={m['road.examples.dog']()}
            />
            <figcaption>
              <span>{m['road.hero.caption']()}</span>
              <a href={source} target="_blank" rel="noopener noreferrer">
                Media.io
                <ExternalLink size={12} aria-hidden />
              </a>
            </figcaption>
            <div className="road-sticker" aria-hidden>
              PRIVATE
              <br />
              PROPERTY
            </div>
          </figure>
        </section>

        <div className="road-spec-strip">
          <div className="road-wrap">
            <span>{m['road.facts.photo']()}</span>
            <span>{m['road.facts.length']()}</span>
            <span>{m['road.facts.output']()}</span>
          </div>
        </div>

        <section
          id="road-studio"
          className="road-wrap road-section"
          aria-labelledby="road-studio-title"
        >
          <div className="road-section-head">
            <div>
              <p className="road-kicker">01 / {m['road.studio.kicker']()}</p>
              <h2 id="road-studio-title">{m['road.studio.title']()}</h2>
            </div>
            <p>{m['road.studio.body']()}</p>
          </div>
          <GenjutsuGenerator theme="road" returnPath="/hit-the-road-dude-ai" />
        </section>

        <section
          id="road-examples"
          className="road-wrap road-section"
          aria-labelledby="road-examples-title"
        >
          <div className="road-section-head">
            <div>
              <p className="road-kicker">02 / {m['road.examples.kicker']()}</p>
              <h2 id="road-examples-title">{m['road.examples.title']()}</h2>
            </div>
            <p>{m['road.examples.intro']()}</p>
          </div>
          <div className="road-gallery">
            {HIT_THE_ROAD_THEMES.map((take, i) => (
              <figure
                className={`road-example road-example-${take.slug}`}
                key={take.slug}
              >
                <div className="road-example-film">
                  <video
                    controls
                    playsInline
                    preload="none"
                    src={`/videos/hit-the-road-dude/${take.slug}.mp4`}
                    poster={`/videos/hit-the-road-dude/${take.slug}.jpg`}
                    aria-label={names[i]}
                  />
                </div>
                <figcaption>
                  <p className="road-example-number">0{i + 1}</p>
                  <h3>{names[i]}</h3>
                  <p>{captions[i]}</p>
                  <button type="button" onClick={() => choose(take.slug)}>
                    {m['road.examples.use']()}
                    <CornerDownRight size={17} aria-hidden />
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="road-source-note">
            {m['road.examples.source']()}{' '}
            <a href={source} target="_blank" rel="noopener noreferrer">
              {m['road.examples.source_link']()}
              <ExternalLink size={12} aria-hidden />
            </a>
          </p>
        </section>

        <section className="road-story" aria-labelledby="road-about-title">
          <div className="road-wrap">
            <div className="road-story-copy">
              <p className="road-kicker">03 / {m['road.about.kicker']()}</p>
              <h2 id="road-about-title">{m['road.about.title']()}</h2>
              <p>{m['road.about.body']()}</p>
              <p>
                {m['road.about.history']()}{' '}
                <a
                  href="https://knowyourmeme.com/memes/lock-em-up-state-property"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Know Your Meme
                  <ExternalLink size={12} aria-hidden />
                </a>
              </p>
            </div>
            <ol className="road-beats">
              {beats.map((beat, i) => (
                <li key={beat.title}>
                  <span aria-hidden>0{i + 1}</span>
                  <div>
                    <h3>{beat.title}</h3>
                    <p>{beat.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="road-wrap road-section"
          aria-labelledby="road-how-title"
        >
          <div className="road-section-head">
            <div>
              <p className="road-kicker">04 / {m['road.steps.kicker']()}</p>
              <h2 id="road-how-title">{m['road.steps.title']()}</h2>
            </div>
          </div>
          <ol className="road-steps">
            {steps.map((step, i) => (
              <li key={step.title}>
                <span className="road-step-index" aria-hidden>
                  0{i + 1}
                  <ArrowRight size={24} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="road-home-link">
            {m['road.home.intro']()}{' '}
            <Link href="/">
              {m['road.home.link']({ appName: envConfigs.app_name })}
              <ArrowRight size={15} aria-hidden />
            </Link>
          </p>
        </section>

        <section
          className="road-wrap road-section road-fixes"
          aria-labelledby="road-fixes-title"
        >
          <div>
            <p className="road-kicker">05 / {m['road.fixes.kicker']()}</p>
            <h2 id="road-fixes-title">{m['road.fixes.title']()}</h2>
          </div>
          <div>
            {fixes.map((fix) => (
              <article key={fix.title}>
                <h3>{fix.title}</h3>
                <p>{fix.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="road-wrap road-section road-faq"
          aria-labelledby="road-faq-title"
        >
          <div>
            <p className="road-kicker">06 / FAQ</p>
            <h2 id="road-faq-title">{m['road.faq.title']()}</h2>
          </div>
          <div>
            {faq.map((item) => (
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

        <section
          className="road-wrap road-end"
          aria-labelledby="road-end-title"
        >
          <div>
            <p className="road-kicker">{m['road.cta.kicker']()}</p>
            <h2 id="road-end-title">{m['road.cta.title']()}</h2>
          </div>
          <a className="road-button" href="#road-studio">
            {m['road.hero.cta']()}
            <ArrowRight size={20} aria-hidden />
          </a>
        </section>
      </main>
      <RelatedTrends currentSlug="hit-the-road-dude-ai" />
      <Footer />
    </>
  );
}
