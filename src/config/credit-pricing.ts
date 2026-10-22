/**
 * Credit pricing helpers (client-safe, no server imports).
 *
 * 1 credit is sold at no less than $0.01 (see ./pricing.ts), and each
 * generation is charged at ≥ 7× its provider cost.
 */

export const PRICE_MARKUP = 7;
export const USD_PER_CREDIT = 0.01;
/**
 * Every charge and every pack is a whole number of this unit ($3.50, the
 * cheapest generation), so any balance can always be spent down to zero.
 */
export const CREDIT_UNIT = 350;

/** Provider cost → credits: ≥ 7× markup, rounded up to a whole CREDIT_UNIT. */
export function creditsForCost(usd: number) {
  // Round off float noise (0.6 × 7 / 0.01 = 420.00000000000006) first.
  const credits = Number(((usd * PRICE_MARKUP) / USD_PER_CREDIT).toFixed(6));
  return Math.ceil(credits / CREDIT_UNIT) * CREDIT_UNIT;
}
