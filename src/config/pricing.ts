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
  /** Only purchasable by accounts without a paid order (checkout enforces). */
  firstOrderOnly?: boolean;
  creditsValidDays?: number;
  plan?: PricingPlanInfo;
};

/**
 * Credit catalog. Generation is priced in ./studio-models.ts (provider list
 * price × 7, e.g. 700 credits for a 5s 720p Seedance 2.0 clip) and
 * ./credit-pricing.ts and ./genjutsu.ts.
 *
 * Packs grant shared balance at 1 internal credit = $0.01. The visible packs
 * are sized in whole 10-second Genjutsu videos (990 credits each, see
 * ./genjutsu.ts): 1 / 2 / 3 / 5 / 7 / 10 / 20 / 50 / 100 / 200
 * videos, larger packs carrying a bonus.
 * Each generation charges at least 7× its provider list cost. Existing balances
 * and already-created orders are unchanged; legacy subscriptions remain below.
 * Keys MUST match what the pricing UI sends as product_id.
 *
 * The monthly plans are no longer shown on the pricing page; they stay here
 * so existing subscriptions keep resolving.
 */
export const pricingCatalog: Record<string, PricingProduct> = {
  // Retired first-order deal: kept so earlier orders still resolve.
  pack_first: {
    available: false,
    productId: 'pack_first',
    productName: 'First Video',
    planName: 'First Video',
    description: '$4.90 for one 10-second video, first order only',
    type: PaymentType.ONE_TIME,
    priceInCents: 490,
    currency: 'usd',
    credits: 990,
    bonusCredits: 500,
    firstOrderOnly: true,
  },
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
  // In-between packs. Not `pack_2`: that id still maps to a retired cheap
  // Waffo product from the 2026-10-14 experiment.
  pack_2v: {
    productId: 'pack_2v',
    productName: '2-Video Pack',
    planName: '2-Video Pack',
    description: '$17.90 for two 10-second videos ($19.80 balance)',
    type: PaymentType.ONE_TIME,
    priceInCents: 1790,
    currency: 'usd',
    credits: 1980,
    bonusCredits: 190,
  },
  pack_7v: {
    productId: 'pack_7v',
    productName: '7-Video Pack',
    planName: '7-Video Pack',
    description: '$52.90 for seven 10-second videos ($69.30 balance)',
    type: PaymentType.ONE_TIME,
    priceInCents: 5290,
    currency: 'usd',
    credits: 6930,
    bonusCredits: 1640,
  },
  // Volume packs: the per-video price falls to $6.99 / $6.00 / $5.00 /
  // $4.50 / $4.00.
  pack_10: {
    productId: 'pack_10',
    productName: '10-Video Pack',
    planName: '10-Video Pack',
    description: '$69.90 for ten 10-second videos ($99.00 balance)',
    type: PaymentType.ONE_TIME,
    priceInCents: 6990,
    currency: 'usd',
    credits: 9900,
    bonusCredits: 2910,
  },
  pack_20: {
    productId: 'pack_20',
    productName: '20-Video Pack',
    planName: '20-Video Pack',
    description: '$119.90 for twenty 10-second videos ($198.00 balance)',
    type: PaymentType.ONE_TIME,
    priceInCents: 11990,
    currency: 'usd',
    credits: 19800,
    bonusCredits: 7810,
  },
  pack_50: {
    productId: 'pack_50',
    productName: '50-Video Pack',
    planName: '50-Video Pack',
    description: '$249.90 for fifty 10-second videos ($495.00 balance)',
    type: PaymentType.ONE_TIME,
    priceInCents: 24990,
    currency: 'usd',
    credits: 49500,
    bonusCredits: 24510,
  },
  pack_100: {
    productId: 'pack_100',
    productName: '100-Video Pack',
    planName: '100-Video Pack',
    description: '$449.90 for one hundred 10-second videos ($990.00 balance)',
    type: PaymentType.ONE_TIME,
    priceInCents: 44990,
    currency: 'usd',
    credits: 99000,
    bonusCredits: 54010,
  },
  pack_200: {
    productId: 'pack_200',
    productName: '200-Video Pack',
    planName: '200-Video Pack',
    description: '$799.90 for two hundred 10-second videos ($1,980.00 balance)',
    type: PaymentType.ONE_TIME,
    priceInCents: 79990,
    currency: 'usd',
    credits: 198000,
    bonusCredits: 118010,
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
