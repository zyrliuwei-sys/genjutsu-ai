import { ArrowRight, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Guide card with a templated cover (brand, "Guide" label, headline and an
 * accent tile) rendered in HTML, so every guide gets a cover without an image.
 */
export function GuideCard({
  href,
  coverTitle,
  title,
  brand,
  label,
  readLabel,
  className,
}: {
  href: string;
  /** Long headline shown on the cover. */
  coverTitle: string;
  /** Short card title under the cover. */
  title: string;
  brand: string;
  label: string;
  readLabel: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group border-border bg-card/40 hover:border-primary/50 focus-visible:outline-primary flex flex-col overflow-hidden rounded-2xl border no-underline transition duration-300 hover:-translate-y-1 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="grid aspect-[16/9] grid-cols-[1fr_0.62fr] gap-3 bg-[oklch(0.24_0.012_40)] p-3 text-[oklch(0.93_0.012_80)]"
      >
        <div className="flex min-w-0 flex-col p-2">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold">
            <span className="bg-primary text-primary-foreground grid size-4 place-items-center rounded">
              <Sparkles className="size-2.5" />
            </span>
            {brand}
          </span>
          <span className="text-primary mt-3 font-mono text-[9px] font-semibold tracking-[0.18em] uppercase">
            {label}
          </span>
          <span className="mt-1 line-clamp-4 text-[15px] leading-[1.15] font-bold tracking-tight text-balance">
            {coverTitle}
          </span>
        </div>
        <div className="grid place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.45_0.15_30)] to-[oklch(0.3_0.1_28)] text-white/90">
          <Sparkles className="size-10 transition duration-500 group-hover:scale-110 group-hover:rotate-12" />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="text-foreground text-lg leading-snug font-medium text-balance">
          {title}
        </span>
        <span className="text-primary mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold">
          {readLabel}
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
