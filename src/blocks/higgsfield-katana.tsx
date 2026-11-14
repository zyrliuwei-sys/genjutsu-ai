import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';

import { envConfigs } from '@/config';
import { TREND_HUB_PARENT } from '@/config/trends';
import { Footer } from '@/blocks/footer';
import { GenjutsuGenerator } from '@/blocks/genjutsu-generator';
import { Header } from '@/blocks/header';
import { PageBreadcrumbs } from '@/blocks/page-breadcrumbs';
import { RelatedTrends } from '@/blocks/related-trends';
import {
  KATANA_PATH,
  katanaBriefs,
  katanaExamples,
  katanaFaq,
  katanaSources,
  katanaSteps,
} from '@/content/katana';

import '@/styles/higgsfield-katana.css';

export function HiggsfieldKatana() {
  const example = katanaExamples[0];
  return (
    <>
      <Header />
      <main className="katana-page" lang="en">
        <header className="katana-wrap katana-hero">
          <PageBreadcrumbs
            parents={[TREND_HUB_PARENT]}
            currentPage="Higgsfield Katana"
          />
          <div className="katana-hero-grid">
            <div>
              <p className="katana-kicker">
                Reference video field guide · November 14, 2026
              </p>
              <h1>
                Higgsfield Katana<span>The edit is your starting point.</span>
              </h1>
              <p className="katana-lead">
                Katana rebuilds a reference edit with your characters, products
                or clothing. The footage guides the sequence; your images supply
                the new subjects. It runs through Higgsfield’s connector in
                Claude. <a href={katanaSources.overview}>Official overview ↗</a>
              </p>
              <p className="katana-independent">
                An independent guide by {envConfigs.app_name}. The short-video
                editor on this page is a separate service.
              </p>
              <div className="katana-actions">
                <a className="eg-pill-primary" href="#katana-editor">
                  Try a short character edit <ArrowDown size={17} aria-hidden />
                </a>
                <a className="katana-link" href="#katana-workflow">
                  Learn the Katana workflow <ArrowRight size={17} aria-hidden />
                </a>
              </div>
            </div>
            <figure className="katana-hero-film">
              <video
                controls
                playsInline
                preload="none"
                poster={example.poster}
                src={example.video}
                aria-label={example.title}
              />
              <figcaption>
                <span>01 / Official Higgsfield example</span>
                <span>{example.duration}</span>
              </figcaption>
              <a
                className="katana-source"
                href={example.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch on Higgsfield <ArrowUpRight size={14} aria-hidden />
              </a>
            </figure>
          </div>
          <nav className="katana-index" aria-label="On this page">
            <a href="#katana-inputs">What it does</a>
            <a href="#katana-workflow">Claude setup</a>
            <a href="#katana-cost">Credits & costs</a>
            <a href="#katana-compare">Compare workflows</a>
            <a href="#katana-editor">Short-video editor</a>
            <a href="#katana-faq">FAQ</a>
          </nav>
        </header>

        <section
          className="katana-wrap katana-section"
          id="katana-inputs"
          aria-labelledby="katana-inputs-title"
        >
          <div className="katana-section-head">
            <p className="katana-kicker">01 / Understand the inputs</p>
            <h2 id="katana-inputs-title">
              A reference, your assets, a clear brief.
            </h2>
          </div>
          <div className="katana-three">
            {[
              [
                'The reference edit',
                'Choose a sequence for its opening, shot order and rhythm. Save notes on the moments that make you want to recreate it.',
              ],
              [
                'Your subject images',
                'Choose images that clearly show the person, product or clothing you want to feature. Decide which image identifies each subject.',
              ],
              [
                'The creative brief',
                'Separate the details to preserve from the changes you want. “Keep the final close-up; change the jacket” gives you something specific to review.',
              ],
            ].map(([title, body], i) => (
              <article key={title}>
                <span className="katana-number">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <p className="katana-note">
            These are our preparation tips. For the official input rules, use
            the <a href={katanaSources.help}>Katana help page</a>.
          </p>
        </section>

        <section
          className="katana-wrap katana-section katana-example-grid"
          aria-labelledby="katana-example-title"
        >
          <figure className="katana-square-film">
            <video
              controls
              playsInline
              preload="none"
              src={katanaExamples[1].video}
              poster={katanaExamples[1].poster}
              aria-label={katanaExamples[1].title}
            />
            <figcaption>
              02 / Official library preview · {katanaExamples[1].duration}
            </figcaption>
            <a
              className="katana-source"
              href={katanaExamples[1].source}
              target="_blank"
              rel="noopener noreferrer"
            >
              Source: Higgsfield Katana <ArrowUpRight size={14} aria-hidden />
            </a>
          </figure>
          <div className="katana-copy">
            <p className="katana-kicker">Watch beyond the thumbnail</p>
            <h2 id="katana-example-title">
              The sequence matters as much as the look.
            </h2>
            <p>{katanaExamples[1].note}</p>
            <p>{katanaExamples[0].note}</p>
            <ul className="katana-checks">
              <li>Does the first shot make the subject recognizable?</li>
              <li>
                Do the cuts feel deliberate when you watch at normal speed?
              </li>
              <li>Do clothes, props and facial details stay consistent?</li>
            </ul>
            <p className="katana-note">
              Both videos are Higgsfield demonstrations, hosted by their source.
              They are examples of Katana’s presentation, not results from the
              editor below.
            </p>
          </div>
        </section>

        <section
          className="katana-wrap katana-section"
          id="katana-workflow"
          aria-labelledby="katana-workflow-title"
        >
          <div className="katana-section-head">
            <p className="katana-kicker">02 / The official workflow</p>
            <h2 id="katana-workflow-title">
              How to use Higgsfield Katana in Claude
            </h2>
          </div>
          <ol className="katana-steps">
            {katanaSteps.map((step, i) => (
              <li key={step.title}>
                <span className="katana-number">0{i + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <a className="katana-source" href={step.source}>
                    Official instructions ↗
                  </a>
                </div>
              </li>
            ))}
          </ol>
          <div className="katana-briefs">
            <h3>Three briefs to adapt</h3>
            <p>
              Written for the official Katana workflow in Claude. Replace the
              asset descriptions with your own.
            </p>
            {katanaBriefs.map((brief, i) => (
              <details key={brief.title} open={i === 0}>
                <summary>
                  {brief.title}
                  <span aria-hidden>+</span>
                </summary>
                <pre>{brief.text}</pre>
              </details>
            ))}
          </div>
        </section>

        <section
          className="katana-wrap katana-section katana-cost"
          id="katana-cost"
          aria-labelledby="katana-cost-title"
        >
          <div>
            <p className="katana-kicker">03 / Before you generate</p>
            <h2 id="katana-cost-title">What does Higgsfield Katana cost?</h2>
          </div>
          <div className="katana-copy">
            <p>
              Higgsfield uses the credits in your existing plan. The quote
              appears before generation; versions that need new renders can
              spend more. There is no single price that covers every edit.{' '}
              <a href={katanaSources.overview}>Billing explanation ↗</a>
            </p>
            <p>
              Unlimited access on the Higgsfield website does not carry over to
              MCP generations. Keep the displayed credit estimate separate from
              any website-only allowance.{' '}
              <a href={katanaSources.credits}>MCP credit rules ↗</a>
            </p>
            <p>
              For a useful comparison, write down the total for the first usable
              version, including revisions. Compare that with your budget before
              starting another render.
            </p>
          </div>
        </section>

        <section
          className="katana-wrap katana-section"
          id="katana-compare"
          aria-labelledby="katana-compare-title"
        >
          <div className="katana-section-head">
            <p className="katana-kicker">04 / Choose the scope</p>
            <h2 id="katana-compare-title">Katana or a short character edit?</h2>
            <p>
              Match the workflow to the change you need. The editor here focuses
              on an existing short performance.
            </p>
          </div>
          <div
            className="katana-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Workflow comparison"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Your decision</th>
                  <th scope="col">Official Higgsfield Katana</th>
                  <th scope="col">{envConfigs.app_name} here</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Main job</th>
                  <td>Rebuild the reference edit around new subjects</td>
                  <td>Recast the lead in a short reference scene</td>
                </tr>
                <tr>
                  <th scope="row">Where you work</th>
                  <td>Claude with Higgsfield connected</td>
                  <td>The browser editor below</td>
                </tr>
                <tr>
                  <th scope="row">Inputs</th>
                  <td>Reference edit or preset; up to five images</td>
                  <td>A scene or uploaded clip, plus a character photo</td>
                </tr>
                <tr>
                  <th scope="row">Video scope</th>
                  <td>Check the selected preset and current service limits</td>
                  <td>3–10 seconds; longer uploads are trimmed</td>
                </tr>
                <tr>
                  <th scope="row">Payment</th>
                  <td>Higgsfield plan credits and a generation quote</td>
                  <td>One-time packs; the button shows the current price</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="katana-note">
            Katana details:{' '}
            <a href={katanaSources.overview}>official overview</a>. For a
            comparison with Higgsfield’s separate motion-transfer product, read{' '}
            <a href="/higgsfield-genjutsu-alternative">
              Higgsfield Genjutsu workflows and costs
            </a>
            .
          </p>
        </section>

        <section
          className="katana-editor-wrap"
          id="katana-editor"
          aria-labelledby="katana-editor-title"
        >
          <div className="katana-section-head">
            <p className="katana-kicker">Create on {envConfigs.app_name}</p>
            <h2 id="katana-editor-title">Try a short character edit</h2>
            <p>
              Select a scene or upload a 3–10 second video, then add your photo.
              Generation uses this site’s paid credits. This editor is
              independent of Higgsfield Katana.
            </p>
          </div>
          <GenjutsuGenerator returnPath={KATANA_PATH} />
          <p className="katana-editor-note">
            For your first edit, use one clearly visible lead and an
            unobstructed face. Review the face, hands and background before
            downloading.{' '}
            <a href="/guides/how-to-use-genjutsu-ai">Upload guide</a> ·{' '}
            <a href="/pricing">Video packs</a>
          </p>
        </section>

        <section
          className="katana-wrap katana-section katana-faq"
          id="katana-faq"
          aria-labelledby="katana-faq-title"
        >
          <div>
            <p className="katana-kicker">The practical details</p>
            <h2 id="katana-faq-title">Higgsfield Katana FAQ</h2>
          </div>
          <div>
            {katanaFaq.map(({ q, a, source }) => (
              <details key={q}>
                <summary>
                  {q}
                  <span aria-hidden>+</span>
                </summary>
                <p>{a}</p>
                {source && (
                  <a className="katana-source" href={source}>
                    Source: Higgsfield ↗
                  </a>
                )}
              </details>
            ))}
          </div>
        </section>
        <section
          className="katana-wrap katana-sources"
          aria-label="Research sources"
        >
          <p className="katana-kicker">Sources checked November 14, 2026</p>
          <p>
            <a href={katanaSources.help}>Katana help</a> ·{' '}
            <a href={katanaSources.connect}>Claude connection</a> ·{' '}
            <a href={katanaSources.credits}>Credit rules</a> ·{' '}
            <a href={katanaSources.library}>Official presets</a>
          </p>
          <p>
            Product details and preset availability can change. Use the linked
            official pages for current limits. Explore more{' '}
            <a href="/guides">video guides</a>.
          </p>
        </section>
        <RelatedTrends currentSlug="higgsfield-katana" />
      </main>
      <Footer />
    </>
  );
}
