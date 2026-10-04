import { ArrowRight } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { Reveal } from '@/components/reveal';

const MODELS = [
  {
    key: 'seedance_pro',
    type: 'video',
    href: '/create?kind=video&model=seedance-pro',
    isNew: true,
  },
  {
    key: 'seedance_lite',
    type: 'video',
    href: '/create?kind=video&model=seedance-lite',
  },
  { key: 'gpt_image', type: 'image', href: '/create?kind=image', isNew: true },
  { key: 'duet', type: 'template', href: '/ai-livestream' },
  { key: 'voice', type: 'audio', soon: true },
] as const;

/** The model line-up, set like a credits roll. */
export function Models() {
  return (
    <section id="models" className="scroll-mt-20 px-4 pb-24 sm:pb-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="eg-heading text-4xl leading-[1.05] sm:text-5xl">
            {m['landing.models.title']()}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-md text-lg leading-relaxed">
            {m['landing.models.description']()}
          </p>
          <Link href="/create" className="eg-pill-primary mt-8">
            {m['landing.models.try']()}
            <ArrowRight className="size-4" />
          </Link>
        </Reveal>

        <ul className="border-border border-t">
          {MODELS.map((model, i) => {
            const soon = 'soon' in model && model.soon;
            const row = (
              <div
                className={cn(
                  'grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-7 sm:grid-cols-[1fr_7rem_3rem]',
                  soon && 'opacity-55'
                )}
              >
                <div>
                  <h3 className="eg-heading group-hover:text-primary text-3xl transition-colors sm:text-[34px]">
                    {tDynamic(`landing.models.${model.key}.name`)}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {tDynamic(`landing.models.${model.key}.description`)}
                  </p>
                </div>
                <span className="eg-eyebrow hidden sm:block">
                  {tDynamic(`landing.models.type_${model.type}`)}
                </span>
                <span
                  className={cn(
                    'flex justify-end font-mono text-[11px] tracking-[0.14em] uppercase',
                    'isNew' in model && model.isNew
                      ? 'text-primary-text'
                      : 'text-muted-foreground'
                  )}
                >
                  {soon
                    ? m['landing.models.soon']()
                    : 'isNew' in model && model.isNew
                      ? m['landing.models.new']()
                      : ''}
                  {!soon && !('isNew' in model && model.isNew) && (
                    <ArrowRight className="size-4 opacity-0 transition group-hover:opacity-100" />
                  )}
                </span>
              </div>
            );
            return (
              <li key={model.key} className="border-border border-b">
                <Reveal delay={i * 60}>
                  {'href' in model ? (
                    <Link href={model.href} className="group block">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
