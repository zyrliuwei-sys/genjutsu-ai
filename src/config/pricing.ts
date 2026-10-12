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

import {
  getStudioModel,
  studioCredits,
  type StudioOptions,
} from './studio-models';

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
 * Packs grant shared balance at 1 internal credit = $0.01. The visible packs
 * are sized in whole 10-second Genjutsu videos (990 credits each, see
 * ./genjutsu.ts): 1 / 3 / 5 videos, larger packs carrying a bonus.
 * Each generation charges at least 7× its provider list cost. Existing balances
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
    description: '$9.90 for one 10-second video ($9.90 balance)',
    type: PaymentType.ONE_TIME,
    priceInCents: 990,
    currency: 'usd',
    credits: 990,
    bonusCredits: 0,
  },
  pack_plus: {
    productId: 'pack_plus',
    productName: 'Plus Pack',
    planName: 'Plus Pack',
    description: '$24.90 for three 10-second videos ($29.70 balance)',
    type: PaymentType.ONE_TIME,
    priceInCents: 2490,
    currency: 'usd',
    credits: 2970,
    bonusCredits: 480,
  },
  pack_creator: {
    available: false,
    productId: 'pack_creator',
    productName: 'Creator Pack',
    planName: 'Creator Pack',
    description: '$24.90 shared generation balance',
    type: PaymentType.ONE_TIME,
    priceInCents: 2490,
    currency: 'usd',
    credits: 2490,
    bonusCredits: 0,
  },
  pack_duo: {
    available: false,
    productId: 'pack_duo',
    productName: 'Light Pack',
    planName: 'Light Pack',
    description: '$12.90 shared generation balance',
    type: PaymentType.ONE_TIME,
    priceInCents: 1290,
    currency: 'usd',
    credits: 1290,
    bonusCredits: 0,
  },
  pack_pro: {
    productId: 'pack_pro',
    productName: 'Batch Pack',
    planName: 'Batch Pack',
    description: '$39.90 for five 10-second videos ($49.50 balance)',
    type: PaymentType.ONE_TIME,
    priceInCents: 3990,
    currency: 'usd',
    credits: 4950,
    bonusCredits: 960,
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

/** A generation quote, not a purchasable product; checkout accepts shared packs only. */
export function singleVideoProduct(options: StudioOptions): PricingProduct {
  const model = getStudioModel('seedance-2')!;
  const credits = studioCredits(model, options);
  return {
    productId: `video_seedance2_${options.resolution}_${options.duration}`,
    productName: `Seedance 2.0 · ${options.duration}s · ${options.resolution}`,
    planName: 'Single Video',
    description: `1 text-to-video generation at ${options.duration}s ${options.resolution}`,
    type: PaymentType.ONE_TIME,
    priceInCents: credits,
    currency: 'usd',
    credits,
  };
}

export function listPricingProducts(): PricingProduct[] {
  return Object.values(pricingCatalog).filter((p) => p.available !== false);
}
