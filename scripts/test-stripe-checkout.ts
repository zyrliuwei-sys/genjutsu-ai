// Stripe HTTP contract regression: fake credentials, no network or payments.
import assert from 'node:assert/strict';

import { STRIPE_CHECKOUT_POLICY } from '../src/config/stripe';
import { StripeProvider } from '../src/core/payment/stripe';
import {
  PaymentInterval,
  PaymentType,
  type PaymentOrder,
} from '../src/core/payment/types';

const realFetch = globalThis.fetch;
const requests: { path: string; body: URLSearchParams }[] = [];
let existingCustomer = true;
let rejectCheckout = false;

globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.origin, 'https://api.stripe.com');
  const body = new URLSearchParams(String(init?.body || ''));
  requests.push({ path: url.pathname, body });
  if (url.pathname === '/v1/customers' && init?.method === 'GET') {
    return Response.json({
      object: 'list',
      data: existingCustomer ? [{ id: 'cus_existing' }] : [],
    });
  }
  if (url.pathname === '/v1/customers' && init?.method === 'POST') {
    return Response.json({ id: 'cus_new' });
  }
  assert.equal(url.pathname, '/v1/checkout/sessions');
  assert.equal(init?.method, 'POST');
  if (rejectCheckout) {
    return Response.json(
      {
        error: { type: 'invalid_request_error', message: 'Account not ready' },
      },
      { status: 400 }
    );
  }
  if (body.get('managed_payments[enabled]') === 'true') {
    // Stripe requires a product tax code and forbids merchant-controlled
    // invoices, taxes, or payment methods for Managed Payments.
    assert.match(
      body.get('line_items[0][price_data][product_data][tax_code]') || '',
      /^txcd_\d{8}$/
    );
    for (const key of body.keys()) {
      assert.doesNotMatch(
        key,
        /^(invoice_creation|payment_method_types|payment_method_options|automatic_tax|tax_id_collection)\[/
      );
    }
  }
  return Response.json({
    id: 'cs_test_offline',
    url: 'https://checkout.stripe.com/c/pay/cs_test_offline',
  });
};

try {
  const provider = new StripeProvider({
    ...STRIPE_CHECKOUT_POLICY,
    secretKey: 'offline-test',
    publishableKey: '',
    allowPromotionCodes: true,
    allowedPaymentMethods: ['card', 'wechat_pay', 'alipay'],
  });
  const order: PaymentOrder = {
    type: PaymentType.ONE_TIME,
    price: { amount: 990, currency: 'usd' },
    description: 'One video up to 10 seconds',
    customer: { email: 'buyer@example.test', name: 'Test Buyer' },
    successUrl: 'https://example.test/api/payment/callback?order_no=TEST',
    cancelUrl: 'https://example.test/pricing',
    metadata: { orderNo: 'TEST', userId: 'test-user' },
  };
  const result = await provider.createPayment({ order });
  let body = requests.at(-1)!.body;
  assert.equal(body.get('managed_payments[enabled]'), 'true');
  assert.equal(body.get('locale'), 'en');
  assert.equal(
    body.get('line_items[0][price_data][product_data][tax_code]'),
    'txcd_10105001'
  );
  assert.equal(body.get('line_items[0][price_data][unit_amount]'), '990');
  assert.equal(body.get('line_items[0][price_data][currency]'), 'usd');
  assert.equal(body.get('customer'), 'cus_existing');
  assert.equal(body.get('success_url'), order.successUrl);
  assert.equal(body.get('cancel_url'), order.cancelUrl);
  assert.equal(body.get('metadata[orderNo]'), 'TEST');
  assert.equal(body.get('metadata[userId]'), 'test-user');
  assert.equal(body.get('allow_promotion_codes'), 'true');
  assert.equal(result.checkoutInfo.sessionId, 'cs_test_offline');

  for (const locale of ['en', 'de', 'fr', 'es', 'pt-BR']) {
    await provider.createPayment({ order: { ...order, locale } });
    assert.equal(requests.at(-1)!.body.get('locale'), locale);
  }
  for (const locale of ['zh-CN', 'auto', 'invalid']) {
    await provider.createPayment({ order: { ...order, locale } });
    assert.equal(requests.at(-1)!.body.get('locale'), 'en');
  }

  existingCustomer = false;
  await provider.createPayment({
    order: { ...order, price: { amount: 990, currency: 'cny' } },
  });
  body = requests.at(-1)!.body;
  assert.equal(body.get('customer'), 'cus_new');
  assert.equal(body.get('managed_payments[enabled]'), 'true');
  assert.equal(body.get('payment_method_types[0]'), null);

  // The settings connection test omits a customer. It must use the same policy.
  await provider.createPayment({ order: { ...order, customer: undefined } });
  assert.equal(requests.at(-1)!.body.get('customer'), null);
  assert.equal(requests.at(-1)!.body.get('managed_payments[enabled]'), 'true');

  await provider.createPayment({
    order: {
      ...order,
      type: PaymentType.SUBSCRIPTION,
      plan: { name: 'Legacy plan', interval: PaymentInterval.MONTH },
      discount: { code: 'promo_test' },
    },
  });
  body = requests.at(-1)!.body;
  assert.equal(body.get('mode'), 'subscription');
  assert.equal(
    body.get('line_items[0][price_data][recurring][interval]'),
    'month'
  );
  assert.equal(body.get('discounts[0][promotion_code]'), 'promo_test');
  assert.equal(body.get('allow_promotion_codes'), null);

  // Other integrations can still explicitly use standard Stripe.
  const standard = new StripeProvider({
    secretKey: 'offline-test',
    publishableKey: '',
    managedPayments: false,
    allowedPaymentMethods: ['card', 'wechat_pay'],
  });
  await standard.createPayment({
    order: { ...order, price: { amount: 990, currency: 'cny' } },
  });
  body = requests.at(-1)!.body;
  assert.equal(body.get('managed_payments[enabled]'), 'false');
  assert.equal(body.get('invoice_creation[enabled]'), 'true');
  assert.equal(body.get('payment_method_types[1]'), 'wechat_pay');

  const missingTaxCode = new StripeProvider({
    secretKey: 'offline-test',
    publishableKey: '',
    managedPayments: true,
    productTaxCode: ' ',
  });
  let count = requests.length;
  await assert.rejects(missingTaxCode.createPayment({ order }), /tax code/);
  assert.equal(
    requests.length,
    count,
    'Reject missing tax codes before API calls'
  );

  rejectCheckout = true;
  count = requests.length;
  await assert.rejects(
    provider.createPayment({ order: { ...order, customer: undefined } }),
    /Account not ready/
  );
  assert.equal(
    requests.length,
    count + 1,
    'Do not retry rejected checkout requests'
  );
  console.log(
    'PASS: Stripe Managed Payments tax code, supported parameters, customer handling, callbacks, discounts, standard checkout and failures.'
  );
} finally {
  globalThis.fetch = realFetch;
}
