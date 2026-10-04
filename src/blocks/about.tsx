import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';
import { Reveal } from '@/components/reveal';

const REASONS = ['prompt', 'vertical', 'cost', 'history'] as const;

/** "What is Genjutsu AI?" long-form intro + the reasons people switch. */
export function About() {
  return (
    <section
      id="about"
      className="border-border bg-muted/40 scroll-mt-20 border-y px-4 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <p className="eg-eyebrow">{m['landing.about.eyebrow']()}</p>
            <h2 className="eg-heading mt-4 text-5xl leading-[1.02] sm:text-6xl">
              {m['landing.about.title']()}
            </h2>
            <img
              src="/logo.svg"
              alt=""
              width={512}
              height={512}
              className="mt-10 hidden size-20 -rotate-6 rounded-xl lg:block"
            />
          </Reveal>
          <Reveal className="text-foreground/85 max-w-2xl space-y-6 text-lg leading-[1.75]">
            <p className="first-letter:text-primary first-letter:float-left first-letter:mt-1.5 first-letter:mr-3 first-letter:font-serif first-letter:text-[4.6rem] first-letter:leading-[0.8]">
              {m['landing.about.p1']()}
            </p>
            <p>{m['landing.about.p2']()}</p>
            <p>{m['landing.about.p3']()}</p>
          </Reveal>
        </div>

        <Reveal className="mt-24 sm:mt-32">
          <h3 className="eg-heading text-3xl sm:text-4xl">
            {m['landing.why.title']()}
          </h3>
        </Reveal>
        <div className="mt-10 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((key, i) => (
            <Reveal key={key} delay={i * 70}>
              <div className="border-primary border-t-2 pt-5">
                <h4 className="text-lg font-medium tracking-tight">
                  {tDynamic(`landing.why.${key}.title`)}
                </h4>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  {tDynamic(`landing.why.${key}.description`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
