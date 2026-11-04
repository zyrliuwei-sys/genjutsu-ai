import type { PaymentProvider } from '@/components/payment-provider-modal';

// Display order only. The admin's enabled/default/selection settings decide
// which methods a buyer may actually choose.
const PROVIDERS: PaymentProvider[] = [
  'waffo',
  'stripe',
  'creem',
  'paypal',
  'alipay',
  'wechat',
];

export function paymentOptions(
  config: Record<string, string>
): PaymentProvider[] {
  const enabled = PROVIDERS.filter(
    (provider) => config[`${provider}_enabled`] === 'true'
  );
  if (config.select_payment_enabled === 'true') return enabled;
  const preferred = enabled.find(
    (provider) => provider === config.default_payment_provider
  );
  return preferred ? [preferred] : enabled.slice(0, 1);
}

export function formatUsd(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
