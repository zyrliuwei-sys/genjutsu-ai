/**
 * Authoritative pricing catalog.
 *
 * The checkout API uses this as the SOURCE OF TRUTH for price/credits/duration.
 * Any price, credits, or plan info sent by the client is IGNORED — only the
 * product_id is honored, and everything else is looked up here.
 *
 * To change pricing, edit this file and redeploy. Admin UI cannot alter prices.
 */

import { PaymentInterval, PaymentType } from '@/core/payment/types';

export type PricingPlanInfo = {
  name: string;
  interval: PaymentInterval;
  intervalCount: number;
};

export type PricingProduct = {
  productId: string;
  productName: string;
  planName: string;
  description: string;
  type: PaymentType;
  priceInCents: number;
  currency: string;
  credits: number;
  creditsValidDays?: number;
  plan?: PricingPlanInfo;
};

/**
 * Credit catalog. Generation is priced in ./studio-models.ts (Seedance 2.0
 * via Evolink: 700 credits for a 5s 720p clip) and ./hotel-lobby-pricing.ts.
 *
 * Pricing floor: no product may sell credits below $0.01 each, so every
 * generation is sold at ≥ 7× its provider cost. That is why packs carry no
 * volume bonus — check priceInCents / credits ≥ 0.01 before adding a product.
 * Keys MUST match what the pricing UI sends as product_id.
 *
 * The monthly plans are no longer shown on the pricing page; they stay here
 * so existing subscriptions keep resolving.
 */
export const pricingCatalog: Record<string, PricingProduct> = {
  pack_starter: {
    productId: 'pack_starter',
    productName: 'Starter Pack',
    planName: 'Starter Pack',
    description: 'Starter Pack',
    type: PaymentType.ONE_TIME,
    priceInCents: 1000,
    currency: 'usd',
    credits: 1000,
  },
  pack_creator: {
    productId: 'pack_creator',
    productName: 'Creator Pack',
    planName: 'Creator Pack',
    description: 'Creator Pack',
    type: PaymentType.ONE_TIME,
    priceInCents: 2500,
    currency: 'usd',
    credits: 2500,
  },
  pack_pro: {
    productId: 'pack_pro',
    productName: 'Pro Pack',
    planName: 'Pro Pack',
    description: 'Pro Pack',
    type: PaymentType.ONE_TIME,
    priceInCents: 5000,
    currency: 'usd',
    credits: 5000,
  },
  pack_studio: {
    productId: 'pack_studio',
    productName: 'Studio Pack',
    planName: 'Studio Pack',
    description: 'Studio Pack',
    type: PaymentType.ONE_TIME,
    priceInCents: 10000,
    currency: 'usd',
    credits: 10000,
  },
  basic_monthly: {
    productId: 'basic_monthly',
    productName: 'Basic',
    planName: 'Basic Monthly',
    description: 'Basic Monthly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 2300,
    currency: 'usd',
    credits: 2200,
    plan: {
      name: 'Basic',
      interval: PaymentInterval.MONTH,
      intervalCount: 1,
    },
  },
  pro_monthly: {
    productId: 'pro_monthly',
    productName: 'Pro',
    planName: 'Pro Monthly',
    description: 'Pro Monthly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 4400,
    currency: 'usd',
    credits: 4400,
    plan: {
      name: 'Pro',
      interval: PaymentInterval.MONTH,
      intervalCount: 1,
    },
  },
  studio_monthly: {
    productId: 'studio_monthly',
    productName: 'Studio',
    planName: 'Studio Monthly',
    description: 'Studio Monthly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 8800,
    currency: 'usd',
    credits: 8800,
    plan: {
      name: 'Studio',
      interval: PaymentInterval.MONTH,
      intervalCount: 1,
    },
  },
};

export function getPricingProduct(productId: string): PricingProduct | null {
  if (!productId) return null;
  return pricingCatalog[productId] ?? null;
}

export function listPricingProducts(): PricingProduct[] {
  return Object.values(pricingCatalog);
}
