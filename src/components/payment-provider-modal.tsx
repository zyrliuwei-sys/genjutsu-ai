'use client';

import type { ReactNode } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

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
  title: string;
  description: string;
  labels?: Partial<Record<PaymentProvider, string>>;
  hints?: Partial<Record<PaymentProvider, string>>;
  notice?: ReactNode;
  busy?: boolean;
}

const providerLabel: Record<PaymentProvider, string> = {
  stripe: 'Stripe',
  creem: 'Creem',
  paypal: 'PayPal',
  alipay: 'Alipay',
  wechat: 'WeChat Pay',
  waffo: 'Waffo',
};

export function PaymentProviderModal({
  open,
  onOpenChange,
  providers,
  loadingProvider,
  onSelect,
  planName,
  price,
  title,
  description,
  labels,
  hints,
  notice,
  busy = false,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {notice || (
          <div className="mt-2 space-y-2">
            {providers.map((p) => {
              const loading = loadingProvider === p;
              return (
                <Button
                  key={p}
                  variant="outline"
                  className="h-auto min-h-14 w-full justify-start gap-3 py-3 text-left whitespace-normal"
                  disabled={busy || !!loadingProvider}
                  onClick={() => onSelect(p)}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CreditCard className="size-4" />
                  )}
                  <span className="min-w-0">
                    <span className="block">
                      {labels?.[p] || providerLabel[p]}
                    </span>
                    {hints?.[p] && (
                      <span className="text-muted-foreground mt-1 block text-xs leading-relaxed font-normal">
                        {hints[p]}
                      </span>
                    )}
                  </span>
                </Button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
