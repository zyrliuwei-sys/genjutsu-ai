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
 * Hotel Lobby AI catalog. 1 credit ≈ $0.01 at one-time pack rates; a duet
 * video costs 7× its fal cost in credits (see ./hotel-lobby-pricing.ts).
 * Subscriptions add volume bonuses; yearly = 12 months of credits upfront
 * at 20% off (whole-dollar monthly equivalent).
 * Keys MUST match what the pricing UI sends as product_id.
 */
export const pricingCatalog: Record<string, PricingProduct> = {
  pack_starter: {
    productId: 'pack_starter',
    productName: 'Starter Pack',
    planName: 'Starter Pack',
    description: 'Starter Pack',
    type: PaymentType.ONE_TIME,
    priceInCents: 1300,
    currency: 'usd',
    credits: 1300,
  },
  pack_standard: {
    productId: 'pack_standard',
    productName: 'Standard Pack',
    planName: 'Standard Pack',
    description: 'Standard Pack',
    type: PaymentType.ONE_TIME,
    priceInCents: 3000,
    currency: 'usd',
    credits: 3000,
  },
  pack_pro: {
    productId: 'pack_pro',
    productName: 'Pro Pack',
    planName: 'Pro Pack',
    description: 'Pro Pack',
    type: PaymentType.ONE_TIME,
    priceInCents: 8000,
    currency: 'usd',
    credits: 8000,
  },
  basic_monthly: {
    productId: 'basic_monthly',
    productName: 'Basic',
    planName: 'Basic Monthly',
    description: 'Basic Monthly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 2000,
    currency: 'usd',
    credits: 2000,
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
    priceInCents: 5000,
    currency: 'usd',
    credits: 5500,
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
    priceInCents: 10000,
    currency: 'usd',
    credits: 11500,
    plan: {
      name: 'Studio',
      interval: PaymentInterval.MONTH,
      intervalCount: 1,
    },
  },
  basic_yearly: {
    productId: 'basic_yearly',
    productName: 'Basic',
    planName: 'Basic Yearly',
    description: 'Basic Yearly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 19200,
    currency: 'usd',
    credits: 24000,
    plan: {
      name: 'Basic',
      interval: PaymentInterval.YEAR,
      intervalCount: 1,
    },
  },
  pro_yearly: {
    productId: 'pro_yearly',
    productName: 'Pro',
    planName: 'Pro Yearly',
    description: 'Pro Yearly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 48000,
    currency: 'usd',
    credits: 66000,
    plan: {
      name: 'Pro',
      interval: PaymentInterval.YEAR,
      intervalCount: 1,
    },
  },
  studio_yearly: {
    productId: 'studio_yearly',
    productName: 'Studio',
    planName: 'Studio Yearly',
    description: 'Studio Yearly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 96000,
    currency: 'usd',
    credits: 138000,
    plan: {
      name: 'Studio',
      interval: PaymentInterval.YEAR,
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
