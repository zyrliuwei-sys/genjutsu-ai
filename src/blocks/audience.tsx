import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';
import { LoopVideo } from '@/components/loop-video';
import { Reveal } from '@/components/reveal';

const AUDIENCES = ['creators', 'shorts', 'marketers'] as const;
const STEPS = ['one', 'two', 'three'] as const;

/** Who it's for (beside a tall still) + how it works. */
export function Audience() {
  return (
    <section id="how" className="scroll-mt-20 px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <Reveal className="order-2 lg:order-1">
            <div className="eg-screen aspect-[4/5] overflow-hidden rounded-md">
              <LoopVideo
                src="/videos/show-talking.mp4"
                poster="/imgs/showcase/show-talking.jpg"
                label={m['landing.alt.audience']()}
                width={576}
                height={942}
                className="size-full"
              />
            </div>
          </Reveal>
          <div className="order-1 lg:order-2">
            <Reveal>
              <h2 className="eg-heading text-4xl leading-[1.05] sm:text-5xl">
                {m['landing.audience.title']()}
              </h2>
            </Reveal>
            <Reveal>
              <dl className="mt-10">
                {AUDIENCES.map((key) => (
                  <div
                    key={key}
                    className="border-border grid gap-2 border-t py-7 sm:grid-cols-[12rem_1fr] sm:gap-8"
                  >
                    <dt className="eg-heading text-2xl">
                      {tDynamic(`landing.audience.${key}.title`)}
                    </dt>
                    <dd className="text-muted-foreground leading-relaxed">
                      {tDynamic(`landing.audience.${key}.description`)}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>

        <Reveal className="mt-24 sm:mt-32">
          <h2 className="eg-heading text-3xl sm:text-4xl">
            {m['landing.how.title']()}
          </h2>
        </Reveal>
        <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-12">
          {STEPS.map((step, i) => (
            <li key={step}>
              <Reveal delay={i * 80}>
                <span className="text-primary font-serif text-6xl leading-none italic">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-medium tracking-tight">
                  {tDynamic(`landing.how.${step}.title`)}
                </h3>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  {tDynamic(`landing.how.${step}.description`)}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
