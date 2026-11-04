/**
 * Checkout policy shared by purchases and the admin connection test.
 * The site sells access to cloud-hosted AI generation for personal use.
 * https://docs.stripe.com/payments/managed-payments/eligibility
 */
export const STRIPE_CHECKOUT_POLICY = {
  managedPayments: true,
  productTaxCode: 'txcd_10105001',
} as const;
