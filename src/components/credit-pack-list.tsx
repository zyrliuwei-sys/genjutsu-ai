import { useState, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PricingPlan } from '@/components/pricing-table';
import { Button } from '@/components/ui/button';

export type CreditPack = PricingPlan & {
  /** Big row label, e.g. "2,970 credits". */
  amount: string;
  /** Small line under the amount, e.g. "3 videos · $8.30 each". */
  detail?: string;
  /** Discount chip beside the amount, e.g. "-16%". */
  discount?: string;
  /** Highlighted chip, e.g. "Popular" / "Best value". */
  tag?: string;
};

/**
 * Selectable credit pack list: pick a row, then one checkout button.
 * The `featured` pack starts selected.
 */
export function CreditPackList({
  packs,
  busy,
  buyLabel,
  processingLabel,
  footnote,
  perks,
  onCheckout,
}: {
  packs: CreditPack[];
  busy?: boolean;
  buyLabel: (pack: CreditPack) => string;
  processingLabel: string;
  footnote?: ReactNode;
  perks?: { icon: ReactNode; label: string }[];
  onCheckout: (pack: CreditPack) => void;
}) {
  const [selectedId, setSelectedId] = useState(
    (packs.find((pack) => pack.featured) ?? packs[0])?.id
  );
  const selected = packs.find((pack) => pack.id === selectedId) ?? packs[0];
  if (!selected) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <div
        role="radiogroup"
        className="border-primary/50 bg-card shadow-primary/40 rounded-2xl border p-3 shadow-[0_30px_80px_-50px] sm:p-5"
      >
        <div className="flex flex-col gap-2.5">
          {packs.map((pack) => {
            const active = pack.id === selected.id;
            return (
              <button
                key={pack.id}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`credit-pack-${pack.productId}`}
                onClick={() => setSelectedId(pack.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors sm:px-4',
                  active
                    ? 'border-primary bg-primary/10 ring-primary/40 ring-1'
                    : 'bg-muted/40 hover:border-foreground/25 border-transparent'
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/15 text-primary'
                  )}
                  aria-hidden
                >
                  <Sparkles className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-lg font-semibold tabular-nums sm:text-xl">
                      {pack.amount}
                    </span>
                    {pack.discount && (
                      <span className="border-primary/60 text-primary rounded-md border px-1.5 py-0.5 text-xs leading-none font-semibold">
                        {pack.discount}
                      </span>
                    )}
                    {pack.tag && (
                      <span className="bg-primary text-primary-foreground rounded-md px-1.5 py-0.5 text-xs leading-none font-semibold">
                        {pack.tag}
                      </span>
                    )}
                  </span>
                  {pack.detail && (
                    <span className="text-muted-foreground mt-0.5 block truncate text-xs sm:text-sm">
                      {pack.detail}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end sm:flex-row sm:items-baseline sm:gap-2">
                  {pack.originalPrice && (
                    <span className="text-muted-foreground text-xs tabular-nums line-through sm:text-sm">
                      {pack.originalPrice}
                    </span>
                  )}
                  <span className="text-base font-semibold tabular-nums sm:text-lg">
                    {pack.price}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {footnote && (
          <p className="text-muted-foreground mt-4 px-1 text-xs sm:text-sm">
            {footnote}
          </p>
        )}
      </div>

      <div className="mx-auto mt-8 max-w-md">
        <Button
          className="h-13 w-full rounded-xl text-base font-semibold"
          disabled={busy || selected.disabled}
          onClick={() => onCheckout(selected)}
        >
          {busy ? processingLabel : buyLabel(selected)}
        </Button>
      </div>

      {perks && perks.length > 0 && (
        <ul className="text-muted-foreground mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs sm:text-sm">
          {perks.map((perk) => (
            <li key={perk.label} className="flex items-center gap-1.5">
              {perk.icon}
              {perk.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
