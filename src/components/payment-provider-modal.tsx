'use client';

import { CreditCard, Loader2, Wallet } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type PaymentProvider =
  | 'stripe'
  | 'creem'
  | 'paypal'
  | 'alipay'
  | 'wechat'
  | 'waffo';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: PaymentProvider[];
  loadingProvider?: PaymentProvider | null;
  onSelect: (provider: PaymentProvider) => void;
  planName?: string;
  price?: string;
}

// Buyers don't know processor brands — Waffo is shown as the card option.
function providerLabel(p: PaymentProvider) {
  if (p === 'waffo') return m['common.pricing.provider_card']();
  return {
    stripe: 'Stripe',
    creem: 'Creem',
    paypal: 'PayPal',
    alipay: 'Alipay',
    wechat: 'WeChat Pay',
  }[p];
}

// Card first: many buyers have no PayPal account.
const PROVIDER_ORDER: PaymentProvider[] = [
  'waffo',
  'stripe',
  'creem',
  'paypal',
  'alipay',
  'wechat',
];

export function PaymentProviderOptions({
  providers,
  loadingProvider,
  onSelect,
}: {
  providers: PaymentProvider[];
  loadingProvider?: PaymentProvider | null;
  onSelect: (provider: PaymentProvider) => void;
}) {
  const sorted = PROVIDER_ORDER.filter((p) => providers.includes(p));
  return (
    <div className="space-y-2">
      {sorted.map((p) => {
        const Icon = p === 'paypal' ? Wallet : CreditCard;
        return (
          <Button
            key={p}
            variant="outline"
            className="h-12 w-full justify-start gap-3"
            disabled={!!loadingProvider}
            onClick={() => onSelect(p)}
          >
            {loadingProvider === p ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Icon className="size-4" />
            )}
            <span>{providerLabel(p)}</span>
          </Button>
        );
      })}
    </div>
  );
}

export function paymentForText(planName?: string, price?: string) {
  if (!planName) return m['common.pricing.choose_payment_desc']();
  return price
    ? m['common.pricing.payment_for']({ plan: planName, price })
    : m['common.pricing.payment_for_plan']({ plan: planName });
}

export function PaymentProviderModal({
  open,
  onOpenChange,
  providers,
  loadingProvider,
  onSelect,
  planName,
  price,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m['common.pricing.choose_payment']()}</DialogTitle>
          <DialogDescription>
            {paymentForText(planName, price)}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <PaymentProviderOptions
            providers={providers}
            loadingProvider={loadingProvider}
            onSelect={onSelect}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
