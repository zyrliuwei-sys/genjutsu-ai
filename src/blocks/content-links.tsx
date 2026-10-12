import { ArrowUpRight } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';

export const CONTENT_SLUGS = [
  'ai-genjutsu-generator',
  'genjutsu-video-ai',
  'genjutsu-free',
  'higgsfield-genjutsu-alternative',
] as const;

// Permanent homepage links: never automatically remove these after five days.
export function ContentLinks({ currentSlug }: { currentSlug?: string }) {
  const slugs = CONTENT_SLUGS.filter((slug) => slug !== currentSlug);
  return (
    <section
      className={
        currentSlug
          ? 'border-border mt-12 border-t pt-8'
          : 'border-border border-t px-4 py-24 sm:py-28'
      }
    >
      <div className="mx-auto max-w-7xl">
        <h2
          className={cn(
            'eg-heading',
            currentSlug ? 'text-3xl' : 'text-4xl leading-[1.05] sm:text-5xl'
          )}
        >
          {m['landing.resources.title']()}
        </h2>
        <nav
          aria-label={m['landing.resources.title']()}
          className={cn(
            'mt-10 grid gap-4 sm:grid-cols-2',
            currentSlug ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
          )}
        >
          {slugs.map((slug, index) => (
            <Link
              key={slug}
              href={`/${slug}`}
              className="group border-border bg-card/40 hover:border-primary/50 hover:bg-card focus-visible:outline-primary relative flex flex-col overflow-hidden rounded-xl border p-6 no-underline transition duration-300 hover:-translate-y-1 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <span className="flex items-center justify-between">
                <span
                  aria-hidden="true"
                  className="font-mono text-[11px] font-medium tracking-[0.18em] text-[var(--brass)]"
                >
                  {String(index + 1).padStart(2, '0')} /{' '}
                  {String(slugs.length).padStart(2, '0')}
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="text-muted-foreground group-hover:text-primary size-5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </span>
              <span
                className={cn(
                  'text-foreground text-lg leading-snug font-medium text-balance',
                  currentSlug ? 'mt-6' : 'mt-12'
                )}
              >
                {tDynamic(`landing.resources.${slug}.title`)}
              </span>
              {!currentSlug && (
                <span className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  {tDynamic(`landing.resources.${slug}.summary`)}
                </span>
              )}
              <span
                aria-hidden="true"
                className="bg-primary absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
              />
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
