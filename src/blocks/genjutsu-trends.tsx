import { ArrowDown, ArrowRight } from 'lucide-react';

import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { SiteBreadcrumbs } from '@/components/site-breadcrumbs';
import {
  trendSections,
  trendsFaq,
  trendsIntro,
} from '@/content/genjutsu-trends';

import '@/styles/genjutsu-trends.css';

export function GenjutsuTrends() {
  return (
    <>
      <Header />
      <main className="trends-page" lang="en">
        <header className="trends-wrap trends-hero">
          <SiteBreadcrumbs
            homeLabel="Home"
            ariaLabel="Breadcrumb"
            currentPage="Genjutsu AI Trends"
          />
          <p className="trends-kicker">The 2026 scene guide · 10 templates</p>
          <h1>Genjutsu AI Trends</h1>
          <div className="trends-intro-layout">
            <div className="trends-intro" data-testid="trends-intro">
              {trendsIntro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <a className="trends-text-link" href="#pollo-ai-kissing">
                Find your scene <ArrowDown size={17} aria-hidden />
              </a>
            </div>
            <nav className="trends-index" aria-label="In this guide">
              <p className="trends-kicker">In this guide</p>
              <ol>
                {trendSections.map((trend, index) => (
                  <li key={trend.id}>
                    <a href={`#${trend.id}`}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      {trend.title}
                      <ArrowDown size={14} aria-hidden />
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </header>

        <div className="trends-wrap" data-testid="trend-articles">
          {trendSections.map((trend, index) => (
            <section
              className="trends-section"
              id={trend.id}
              key={trend.id}
              aria-labelledby={`${trend.id}-title`}
              data-trend-section
            >
              <div className="trends-section-heading">
                <span className="trends-number" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="trends-kicker">{trend.format}</p>
                  <h2 id={`${trend.id}-title`}>{trend.title}</h2>
                </div>
              </div>
              <div className="trends-section-layout">
                <figure className="trends-figure">
                  <div>
                    <img
                      src={trend.image}
                      alt={`${trend.title} AI video reference scene`}
                      width={trend.imageWidth}
                      height={trend.imageHeight}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <figcaption>
                    <span>{trend.caption}</span>
                    <span>Reference scene</span>
                  </figcaption>
                </figure>
                <div className="trends-copy">
                  <div data-trend-body>
                    {trend.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  <p className="trends-tip">
                    <strong>Template tip.</strong>{' '}
                    <span data-trend-tip>{trend.tip}</span>
                  </p>
                  <div className="trends-actions">
                    <a
                      className="eg-pill-primary"
                      href={`${trend.href}#${trend.studio}`}
                    >
                      Make my version <ArrowRight size={17} aria-hidden />
                    </a>
                    <a className="trends-text-link" href={trend.href}>
                      View the full guide →
                      <span className="sr-only"> {trend.title}</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        <section
          className="trends-wrap trends-faq"
          aria-labelledby="trends-faq-title"
        >
          <div>
            <p className="trends-kicker">Before you make your version</p>
            <h2 id="trends-faq-title">Questions about genjutsu trends</h2>
          </div>
          <div>
            {trendsFaq.map((item) => (
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
      </main>
      <Footer />
    </>
  );
}
