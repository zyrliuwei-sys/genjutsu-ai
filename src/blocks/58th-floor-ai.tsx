import { ArrowDown, ArrowRight, Check } from 'lucide-react';

import { FLOOR_THEMES } from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import {
  FLOOR_GUIDE_PATH,
  FLOOR_PAGE_PATH,
  TREND_HUB_PARENT,
} from '@/config/trends';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';
import { PageBreadcrumbs } from '@/blocks/page-breadcrumbs';
import { RelatedTrends } from '@/blocks/related-trends';
import { ThemeReelCard } from '@/components/theme-reel-card';
import { floorChecks, floorFaq, floorSteps } from '@/content/58th-floor';

import '@/styles/dime-dime-baby-ai.css';
import '@/styles/58th-floor-ai.css';

export function Floor58Ai() {
  const pickTake = (slug: string) => {
    window.dispatchEvent(
      new CustomEvent('genjutsu:select-template', { detail: `floor-${slug}` })
    );
    document.getElementById('floor-studio')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    });
  };
  return (
    <>
      <Header />
      <main className="dime-page floor-page" lang="en">
        <section className="dime-hero" aria-labelledby="floor-title">
          <div>
            <PageBreadcrumbs
              parents={[TREND_HUB_PARENT]}
              currentPage="58th Floor AI"
              className="mb-6"
            />
            <p className="dime-eyebrow">Two photos. One hanging mic.</p>
            <h1 id="floor-title">
              58th Floor AI <span>Your studio duet.</span>
            </h1>
            <p className="dime-intro">
              <span className="dime-long">
                Put you and a friend into the teal-studio performance. Choose a
                take, add one photo for each side of the mic, and make a
                10-second AI video from the reference motion.
              </span>
              <span className="dime-short">
                Two photos. A teal studio. Your turn at the mic.
              </span>
            </p>
            <div className="dime-actions">
              <a href="#floor-studio" className="dime-button">
                Make my version <ArrowRight size={18} aria-hidden />
              </a>
              <a href="#floor-how" className="dime-text-link">
                How it works <ArrowDown size={15} aria-hidden />
              </a>
            </div>
            <ul className="dime-facts">
              {[
                'Two separate portraits',
                '10-second takes',
                '9:16 vertical',
              ].map((text) => (
                <li key={text}>
                  <Check size={14} aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <figure className="floor-stage">
            <video
              src="/videos/58th-floor/references/handoff.mp4"
              poster="/videos/58th-floor/handoff.jpg"
              controls
              playsInline
              preload="none"
              aria-label="58th Floor AI mic handoff reference video"
            />
            <figcaption>
              Reference take · The mic handoff · 10 seconds
            </figcaption>
          </figure>
        </section>

        <section
          id="floor-studio"
          className="dime-studio"
          aria-labelledby="floor-studio-title"
        >
          <div className="dime-section-head dime-studio-head">
            <h2 id="floor-studio-title">Make your 58th Floor video</h2>
            <p>
              Choose a reference, then assign a portrait to each performer. Your
              opening-left and opening-right roles stay separate.
            </p>
          </div>
          <GenjutsuGenerator theme="floor" returnPath={FLOOR_PAGE_PATH} />
          <p className="dime-price">
            Personalized videos from $
            {(pricingCatalog.pack_starter.priceInCents / 100).toFixed(2)} ·
            One-time packs · Two photos per duet
          </p>
        </section>

        <section
          className="dime-section"
          id="floor-examples"
          aria-labelledby="floor-examples-title"
        >
          <div className="dime-section-head">
            <h2 id="floor-examples-title">Same studio. Pick your take.</h2>
            <p>
              Watch the movement and check who starts on each side. Each preview
              is the 10-second reference used by its template.
            </p>
          </div>
          <div className="dime-reel floor-reel">
            {FLOOR_THEMES.map((take, i) => (
              <div key={take.slug}>
                <ThemeReelCard
                  index={i + 1}
                  src={`/videos/58th-floor/references/${take.slug}.mp4`}
                  poster={`/videos/58th-floor/${take.slug}.jpg`}
                  title={take.name}
                  actionLabel="Use this take"
                  onAction={() => pickTake(take.slug)}
                />
                <p className="floor-role-note">
                  Photo 1: opening-left {take.left}. Photo 2: opening-right{' '}
                  {take.right}.
                </p>
              </div>
            ))}
          </div>
          <p className="dime-note">
            Reference examples adapted from{' '}
            <a
              href="https://www.getstarrd.app/blog/how-to-make-58th-floor-ai-video"
              target="_blank"
              rel="noopener noreferrer"
            >
              Starrd’s 58th Floor previews
            </a>
            . These are scene references, not results generated from your
            photos.
          </p>
        </section>

        <section className="dime-about" aria-labelledby="floor-about-title">
          <div className="dime-section dime-about-grid">
            <div>
              <p className="dime-kicker">The scene behind the trend</p>
              <h2 id="floor-about-title">What is 58th Floor AI?</h2>
              <p className="dime-about-line">
                A duet, a reaction, a turn at the microphone.
              </p>
            </div>
            <div className="dime-prose">
              <p>
                “58th Floor” is a song by Anderson .Paak and Cordae. Their
                COLORS performance places the pair in a teal studio, with a
                microphone suspended between them. The sparse setting keeps the
                focus on the exchange: one person performs while the other
                listens, reacts and takes over. It is a music-performance scene,
                not a high-rise apartment reveal.
              </p>
              <p>
                The AI version recasts those two roles. Instead of filming a
                duet or describing choreography from scratch, you provide the
                portraits and choose a prepared clip. This editor uses the
                reference to guide the movement, gestures, framing and timing
                while assigning a different identity to each performer. A
                close-up is part of the same role, not an invitation to swap the
                two faces.
              </p>
              <p>
                The two takes here use short, vertical excerpts. You can compare
                the opening positions before uploading and choose the
                performance that suits your pair. The source previews
                demonstrate the scene; they do not promise an identical result
                or perfect lip-sync for every portrait.
              </p>
              <p>
                <a href={FLOOR_GUIDE_PATH}>
                  Read the full 58th Floor guide and watch the original
                  performance →
                </a>
              </p>
            </div>
          </div>
        </section>

        <section
          id="floor-how"
          className="dime-section"
          aria-labelledby="floor-how-title"
        >
          <div className="dime-section-head">
            <h2 id="floor-how-title">From two photos to your duet</h2>
            <p>
              No motion prompt to write. Start with the take you want to appear
              in.
            </p>
          </div>
          <ol className="dime-grid3">
            {floorSteps.map((step, i) => (
              <li className="dime-card" key={step.title}>
                <span className="dime-step-number">0{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="dime-section" aria-labelledby="floor-checks-title">
          <div className="dime-section-head">
            <h2 id="floor-checks-title">Get both roles right</h2>
            <p>A few checks before you generate and before you share.</p>
          </div>
          <div className="dime-grid3">
            {floorChecks.map((item) => (
              <article className="dime-card" key={item.title}>
                <Check size={19} aria-hidden />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="dime-section dime-faq"
          aria-labelledby="floor-faq-title"
        >
          <div>
            <p className="dime-kicker">Before your first take</p>
            <h2 id="floor-faq-title">58th Floor AI questions</h2>
          </div>
          <div>
            {floorFaq.map(({ q, a }) => (
              <details key={q}>
                <summary>
                  {q}
                  <span aria-hidden>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="dime-cta">
          <div className="dime-cta-inner">
            <h2>Your friend. Your mic. Your version.</h2>
            <p>
              Choose a performance and bring two clear portraits. Check both
              roles before you start.
            </p>
            <a className="dime-button" href="#floor-studio">
              Make my 58th Floor video <ArrowRight size={18} aria-hidden />
            </a>
          </div>
        </section>
        <RelatedTrends currentSlug="58th-floor-ai" />
      </main>
      <Footer />
    </>
  );
}
