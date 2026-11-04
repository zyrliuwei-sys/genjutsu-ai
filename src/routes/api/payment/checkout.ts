import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { normalizeCheckoutLocale } from '@/core/payment/locale';
import { PaymentType } from '@/core/payment/types';
import { getPricingProduct } from '@/config/pricing';
import { getAllConfigs } from '@/modules/config/service';
import { createCheckout, hasPaidPurchase } from '@/modules/payment/service';
import { hasPermission } from '@/modules/rbac/service';
import { paymentReturnUrls } from '@/lib/checkout-return';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000,
    keyPrefix: 'checkout',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return respErr('Unauthorized');
    }

    const body = await request.json().catch(() => ({}));
    const { product_id, payment_provider, redirect, cancel_redirect } = body;

    if (!product_id || typeof product_id !== 'string') {
      return respErr('Missing product_id');
    }

    // Look up product in the authoritative server-side catalog.
    // We DO NOT trust price / credits / plan from the request body.
    const product = getPricingProduct(product_id);
    if (!product) {
      return respErr('Unknown product');
    }

    if (product.type === PaymentType.SUBSCRIPTION) {
      return respErr(
        'Monthly subscriptions are not currently available. Please choose a one-time credit pack.'
      );
    }

    if (product.firstOrderOnly && (await hasPaidPurchase(session.user.id))) {
      return respErr('This offer is for your first order only');
    }

    // Optional per-provider "test amount" override (admin-configured).
    // Only the charged amount is overridden — credits granted and order
    // amount stored both come from the authoritative catalog.
    const configs = await getAllConfigs();
    const providerKey = payment_provider || configs.default_payment_provider;
    const testAmountRaw = providerKey
      ? configs[`${providerKey}_test_amount`]
      : undefined;
    const testAmount = testAmountRaw ? parseInt(testAmountRaw) : 0;
    // Test amounts must never silently discount a real customer's purchase.
    const chargeAmount =
      testAmount > 0 && (await hasPermission(session.user.id, 'admin.*'))
        ? testAmount
        : product.priceInCents;

    // Build success/cancel URLs — only accept same-origin redirects.
    const baseUrl = configs.app_url || 'http://localhost:3000';
    const { successUrl, cancelUrl } = paymentReturnUrls(
      baseUrl,
      redirect,
      cancel_redirect
    );

    const checkout = await createCheckout({
      userId: session.user.id,
      userEmail: session.user.email,
      productName: product.productName,
      planName: product.planName,
      credits: product.credits,
      creditsValidDays: product.creditsValidDays,
      paymentOrder: {
        productId: product.productId,
        price: { amount: chargeAmount, currency: product.currency },
        type: product.type,
        description: product.description,
        locale: normalizeCheckoutLocale(body.locale),
        successUrl,
        cancelUrl,
        customer: {
          email: session.user.email,
          name: session.user.name,
        },
        plan: product.plan
          ? {
              name: product.plan.name,
              interval: product.plan.interval,
              intervalCount: product.plan.intervalCount,
            }
          : undefined,
        metadata: {
          userId: session.user.id,
        },
      },
      provider: payment_provider,
    });

    return respData({ checkout_url: checkout.checkoutInfo.checkoutUrl });
  } catch (error: any) {
    console.error('checkout error:', error);
    return respErr(error.message || 'Checkout failed');
  }
}

export const Route = createFileRoute('/api/payment/checkout')({
  server: {
    handlers: { POST },
  },
});
