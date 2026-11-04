import { CreditCard, Loader2, Wallet } from 'lucide-react';

import type { PaymentProvider } from '@/components/payment-provider-modal';
import { Button } from '@/components/ui/button';

export type PaymentButtonOption = {
  provider: PaymentProvider;
  label: string;
};

/** Payment methods are the purchase actions; no second picker is needed. */
export function PaymentButtons({
  options,
  busy,
  loadingProvider,
  processingLabel,
  onSelect,
}: {
  options: PaymentButtonOption[];
  busy: boolean;
  loadingProvider?: PaymentProvider | null;
  processingLabel: string;
  onSelect: (provider: PaymentProvider) => void;
}) {
  return (
    <div
      className="grid gap-2.5"
      aria-busy={busy}
      data-testid="payment-actions"
    >
      {options.map(({ provider, label }, index) => {
        const Icon = provider === 'paypal' ? Wallet : CreditCard;
        const pending = busy && provider === loadingProvider;
        return (
          <Button
            key={provider}
            type="button"
            variant={index === 0 ? 'default' : 'outline'}
            className="h-auto min-h-12 w-full gap-2.5 rounded-xl px-4 py-3 text-base whitespace-normal"
            data-testid={`pay-with-${provider}`}
            disabled={busy}
            onClick={() => onSelect(provider)}
          >
            {pending ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Icon className="size-4 shrink-0" aria-hidden />
            )}
            <span>{pending ? processingLabel : label}</span>
          </Button>
        );
      })}
    </div>
  );
}
