import { ArrowDown, ArrowRight, Check } from 'lucide-react';

import {
  SHERU_GUIDE_PATH,
  SHERU_PAGE_PATH,
  TREND_HUB_PARENT,
} from '@/config/trends';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';
import { PageBreadcrumbs } from '@/blocks/page-breadcrumbs';
import { RelatedTrends } from '@/blocks/related-trends';
import { sheruFaq, sheruSteps } from '@/content/sheru';

import '@/styles/dime-dime-baby-ai.css';
import '@/styles/sheru-bhai-ai.css';

export function SheruBhaiAi() {
  return (
    <>
      <Header />
      <main className="dime-page sheru-page" lang="en">
        <section className="dime-hero" aria-labelledby="sheru-title">
          <div>
            <PageBreadcrumbs
              parents={[TREND_HUB_PARENT]}
              currentPage="Sheru Bhai AI"
              className="mb-6"
            />
            <p className="dime-eyebrow">One photo. A lion’s entrance.</p>
            <h1 id="sheru-title">
              Sheru Bhai AI <span>Make your entrance.</span>
            </h1>
            <p className="dime-intro">
              <span className="dime-long">
                Turn your full-body photo into a lion-headed character. Start
                with the palace walk, use your outfit as the reference, and
                create a 10-second vertical video.
              </span>
              <span className="dime-short">
                Your photo. A lion head. A 10-second palace walk.
              </span>
            </p>
            <div className="dime-actions">
              <a href="#sheru-studio" className="dime-button">
                Make my Sheru video <ArrowRight size={18} aria-hidden />
              </a>
              <a href="#sheru-how" className="dime-text-link">
                How it works <ArrowDown size={15} aria-hidden />
              </a>
            </div>
            <ul className="dime-facts">
              {[
                'One full-body photo',
                '10-second reference',
                '9:16 vertical',
              ].map((text) => (
                <li key={text}>
                  <Check size={14} aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <figure className="sheru-stage">
            <video
              src="/videos/sheru/references/palace.mp4"
              poster="/videos/sheru/palace.jpg"
              controls
              playsInline
              preload="none"
              aria-label="Sheru Bhai palace entrance reference video"
            />
            <figcaption>
              Palace reference · 10 seconds · Silent
              <br />
              <a
                href="https://vismuse.com/tools/sheru-ai"
                target="_blank"
                rel="noopener noreferrer"
              >
                Example by Vismuse ↗
              </a>
            </figcaption>
          </figure>
        </section>

        <section
          id="sheru-studio"
          className="dime-studio"
          aria-labelledby="sheru-studio-title"
        >
          <div className="dime-section-head dime-studio-head">
            <h2 id="sheru-studio-title">Make your Sheru Bhai video</h2>
            <p>
              The palace reference is ready. Add one photo with your clothes and
              shoes visible.
            </p>
          </div>
          <GenjutsuGenerator theme="sheru" returnPath={SHERU_PAGE_PATH} />
        </section>

        <section
          id="sheru-how"
          className="dime-section"
          aria-labelledby="sheru-how-title"
        >
          <div className="dime-section-head">
            <h2 id="sheru-how-title">From one photo to the palace walk</h2>
            <p>Choose the movement first. Let your photo guide the outfit.</p>
          </div>
          <ol className="dime-grid3">
            {sheruSteps.map((step, index) => (
              <li className="dime-card" key={step.title}>
                <span className="dime-step-number">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="dime-about" aria-labelledby="sheru-origin-title">
          <div className="dime-section dime-about-grid">
            <div>
              <p className="dime-kicker">The character behind the entrance</p>
              <h2 id="sheru-origin-title">Who started the Sheru Bhai trend?</h2>
              <p className="dime-about-line">
                An AI lion. More than one origin story.
              </p>
            </div>
            <div className="dime-prose">
              <p>
                Sheru Bhai is a fictional lion character in AI shorts. Some
                videos turn an extravagant auction into a joke; others focus on
                a confident entrance. This generator uses the entrance format,
                with one walking figure in a palace hall.
              </p>
              <p>
                The sources we checked do not verify one creator of the wider
                trend. Digital Tools describes the origin of its own Digital
                Sheru project, rather than claiming every Sheru video. Our
                origin guide separates that account from dated creator uploads.
              </p>
              <a href={SHERU_GUIDE_PATH}>
                Read the Sheru Bhai origin guide and watch the examples →
              </a>
              <p>
                The prepared reference comes from Vismuse’s public Sheru AI
                demonstration. It shows the scene used to guide the edit; it is
                not a finished result made from your uploaded photo.
              </p>
            </div>
          </div>
        </section>

        <section className="dime-section" aria-labelledby="sheru-photo-title">
          <div className="dime-section-head">
            <h2 id="sheru-photo-title">Give the lion a clear silhouette</h2>
            <p>Three details that make the reference easier to use.</p>
          </div>
          <div className="dime-grid3">
            {[
              [
                'One standing adult',
                'Choose a solo photo with the whole body visible. Avoid overlapping people and tight head-only crops.',
              ],
              [
                'A readable outfit',
                'Use even lighting and keep the collar, sleeves and shoes visible. The lion head replaces the human face.',
              ],
              [
                'Check the entire walk',
                'Inspect the mane at the collar, the hands and the foot contact across all 10 seconds. Review the movement before sharing.',
              ],
            ].map(([title, body]) => (
              <article className="dime-card" key={title}>
                <Check size={19} aria-hidden />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="dime-section dime-faq"
          aria-labelledby="sheru-faq-title"
        >
          <div className="dime-section-head">
            <h2 id="sheru-faq-title">Sheru Bhai AI questions</h2>
          </div>
          <div className="dime-faq-list">
            {sheruFaq.map(({ q, a }) => (
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
        <RelatedTrends currentSlug="sheru-bhai-ai" />
      </main>
      <Footer />
    </>
  );
}
