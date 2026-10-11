import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export const CONTENT_SLUGS = [
  'ai-genjutsu-generator',
  'genjutsu-video-ai',
  'genjutsu-free',
  'higgsfield-genjutsu-alternative',
] as const;

// Permanent homepage links: never automatically remove these after five days.
export function ContentLinks({ currentSlug }: { currentSlug?: string }) {
  return (
    <section
      className={
        currentSlug
          ? 'border-border mt-12 border-t pt-8'
          : 'border-border border-t px-4 py-16'
      }
    >
      <div className="mx-auto max-w-7xl">
        <h2 className="eg-heading text-3xl">
          {m['landing.resources.title']()}
        </h2>
        <nav
          aria-label={m['landing.resources.title']()}
          className="mt-6 grid gap-6 sm:grid-cols-2"
        >
          {CONTENT_SLUGS.filter((slug) => slug !== currentSlug).map(
            (slug, index) => (
              <div key={slug} className="border-border border-t pt-4">
                <span
                  aria-hidden="true"
                  className="text-primary mr-3 font-mono text-xs"
                >
                  0{index + 1}
                </span>
                <Link
                  href={`/${slug}`}
                  className="text-foreground hover:text-primary focus-visible:outline-primary text-lg font-medium no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  {tDynamic(`landing.resources.${slug}.title`)}
                </Link>
                {!currentSlug && (
                  <p className="text-muted-foreground mt-3 max-w-xl leading-relaxed">
                    {tDynamic(`landing.resources.${slug}.summary`)}
                  </p>
                )}
              </div>
            )
          )}
        </nav>
      </div>
    </section>
  );
}
