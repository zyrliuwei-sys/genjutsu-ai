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

import { GENJUTSU_CREDITS_PER_GENERATION } from './genjutsu';

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
  available?: boolean;
  /** Part of `credits` given on top of the 1 credit = $0.01 base (display). */
  bonusCredits?: number;
  creditsValidDays?: number;
  plan?: PricingPlanInfo;
};

/**
 * Credit catalog. Generation is priced in ./studio-models.ts (provider list
 * price × 7, e.g. 700 credits for a 5s 720p Seedance 2.0 clip) and
 * ./hotel-lobby-pricing.ts and ./genjutsu.ts.
 *
 * New packs grant exact generation units (620 internal credits per unit),
 * not money-denominated leftovers. Their effective paid rate remains ≥7×
 * provider list price. Existing balances
 * and already-created orders are unchanged; legacy subscriptions remain below.
 * Keys MUST match what the pricing UI sends as product_id.
 *
 * The monthly plans are no longer shown on the pricing page; they stay here
 * so existing subscriptions keep resolving.
 */
export const pricingCatalog: Record<string, PricingProduct> = {
  pack_starter: {
    productId: 'pack_starter',
    productName: 'Trial Pack',
    planName: 'Trial Pack',
    description: '1 generation (3–5s); 10s requires 2 generations',
    type: PaymentType.ONE_TIME,
    priceInCents: 690,
    currency: 'usd',
    credits: GENJUTSU_CREDITS_PER_GENERATION,
    bonusCredits: 0,
  },
  pack_creator: {
    productId: 'pack_creator',
    productName: 'Creator Pack',
    planName: 'Creator Pack',
    description: '4 generations: up to 4 × 5s or 2 × 10s',
    type: PaymentType.ONE_TIME,
    priceInCents: 2490,
    currency: 'usd',
    credits: GENJUTSU_CREDITS_PER_GENERATION * 4,
    bonusCredits: 0,
  },
  pack_pro: {
    productId: 'pack_pro',
    productName: 'Batch Pack',
    planName: 'Batch Pack',
    description: '8 generations: up to 8 × 5s or 4 × 10s',
    type: PaymentType.ONE_TIME,
    priceInCents: 4990,
    currency: 'usd',
    credits: GENJUTSU_CREDITS_PER_GENERATION * 8,
    bonusCredits: 0,
  },
  pack_studio: {
    available: false,
    productId: 'pack_studio',
    productName: 'Studio Pack',
    planName: 'Studio Pack',
    description: 'Studio Pack',
    type: PaymentType.ONE_TIME,
    priceInCents: 7900,
    currency: 'usd',
    credits: 7900,
    bonusCredits: 0,
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
  const product = pricingCatalog[productId];
  return product?.available === false ? null : (product ?? null);
}

export function listPricingProducts(): PricingProduct[] {
  return Object.values(pricingCatalog).filter((p) => p.available !== false);
}
