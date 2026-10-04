import { ArrowUpRight } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { Reveal } from '@/components/reveal';

const TUTORIAL_STEPS = [
  'open',
  'describe',
  'format',
  'render',
  'iterate',
] as const;

// Same subject and camera line, one detail swapped per take.
const EFFECTS = [
  {
    key: 'outfit',
    base: 'A dancer spins on a rooftop at dusk, slow orbit, cinematic, wearing',
    from: 'a flowing red silk dress',
    to: 'a black leather jacket and jeans',
  },
  {
    key: 'weather',
    base: 'A street vendor serves steaming noodles under a paper lantern at night, handheld close-up,',
    from: 'light rain',
    to: 'heavy snowfall',
  },
  {
    key: 'scene',
    base: 'A hiker in a yellow jacket walks toward the camera, slow dolly-in,',
    from: 'on a misty mountain ridge',
    to: 'on a neon-lit Tokyo street at night',
  },
] as const;

const COMPARE_ROWS = [
  'input',
  'control',
  'length',
  'resolution',
  'cost',
  'best',
] as const;

const createHref = (prompt: string) =>
  `/create?kind=video&prompt=${encodeURIComponent(prompt)}`;

/** What the name points to (Higgsfield's tool vs this studio) + a tutorial. */
export function Guide() {
  return (
    <section id="guide" className="scroll-mt-20 px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <p className="eg-eyebrow">{m['landing.guide.eyebrow']()}</p>
            <h2 className="eg-heading mt-4 text-4xl leading-[1.05] sm:text-5xl">
              {m['landing.guide.title']()}
            </h2>
          </Reveal>
          <Reveal className="text-foreground/85 max-w-2xl space-y-6 text-lg leading-[1.75]">
            <p>{m['landing.guide.p1']()}</p>
            <p>{m['landing.guide.p2']()}</p>
          </Reveal>
        </div>

        <Reveal className="mt-24 sm:mt-32">
          <h2 className="eg-heading text-3xl sm:text-4xl">
            {m['landing.tutorial.title']()}
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg leading-relaxed">
            {m['landing.tutorial.description']()}
          </p>
        </Reveal>
        <ol className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          {TUTORIAL_STEPS.map((step, i) => (
            <li key={step}>
              <Reveal delay={i * 60}>
                <span className="text-primary font-serif text-5xl leading-none italic">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-medium tracking-tight">
                  {tDynamic(`landing.tutorial.${step}.title`)}
                </h3>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  {tDynamic(`landing.tutorial.${step}.description`)}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
        <Reveal>
          <p className="border-border text-muted-foreground mt-12 max-w-3xl border-l-2 pl-5 leading-relaxed">
            {m['landing.tutorial.note']()}
          </p>
        </Reveal>

        <Reveal className="mt-24 sm:mt-32">
          <h3 className="eg-heading text-3xl sm:text-4xl">
            {m['landing.effects.title']()}
          </h3>
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg leading-relaxed">
            {m['landing.effects.description']()}
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {EFFECTS.map((effect, i) => (
            <Reveal key={effect.key} delay={i * 70}>
              <div className="border-border flex h-full flex-col rounded-md border p-6">
                <p className="eg-eyebrow">
                  {tDynamic(`landing.effects.${effect.key}`)}
                </p>
                <p className="text-muted-foreground mt-4 leading-relaxed">
                  {effect.base}{' '}
                  <span className="text-foreground line-through decoration-1 opacity-70">
                    {effect.from}
                  </span>{' '}
                  <span className="text-primary font-medium">{effect.to}</span>
                </p>
                <Link
                  href={createHref(`${effect.base} ${effect.to}`)}
                  className="text-foreground mt-auto inline-flex items-center gap-1 pt-6 text-sm font-medium hover:underline"
                >
                  {m['landing.effects.try']()}
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Genjutsu vs Seedance comparison + the "is it free?" answer. */
export function Compare() {
  return (
    <section
      id="compare"
      className="border-border bg-muted/40 scroll-mt-20 border-y px-4 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <h2 className="eg-heading max-w-3xl text-4xl leading-[1.05] sm:text-5xl">
            {m['landing.compare.title']()}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-relaxed">
            {m['landing.compare.description']()}
          </p>
        </Reveal>
        <Reveal className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-border border-b">
                <th className="w-[22%] py-4 pr-6" />
                <th className="py-4 pr-6 text-lg font-medium tracking-tight">
                  {m['landing.compare.col_genjutsu']()}
                </th>
                <th className="text-primary py-4 text-lg font-medium tracking-tight">
                  {m['landing.compare.col_seedance']()}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row} className="border-border border-b align-top">
                  <th className="text-muted-foreground py-5 pr-6 text-sm font-normal tracking-wide uppercase">
                    {tDynamic(`landing.compare.${row}.label`)}
                  </th>
                  <td className="py-5 pr-6 leading-relaxed">
                    {tDynamic(`landing.compare.${row}.genjutsu`)}
                  </td>
                  <td className="py-5 leading-relaxed">
                    {tDynamic(`landing.compare.${row}.seedance`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-muted-foreground mt-4 text-sm">
            {m['landing.compare.footnote']()}
          </p>
        </Reveal>

        <div className="mt-24 grid gap-12 sm:mt-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <Reveal>
            <h2 className="eg-heading text-4xl leading-[1.05] sm:text-5xl">
              {m['landing.free.title']()}
            </h2>
          </Reveal>
          <Reveal className="text-foreground/85 max-w-2xl space-y-6 text-lg leading-[1.75]">
            <p>{m['landing.free.p1']()}</p>
            <p>{m['landing.free.p2']()}</p>
            <Link href="/pricing" className="eg-pill-primary inline-flex">
              {m['landing.hero.secondary']()}
              <ArrowUpRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
