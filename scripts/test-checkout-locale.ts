// Exercise the real provider serializers with fake HTTP responses. No payments
// or credentials are used; Waffo signs requests with an ephemeral test key.
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { normalizeCheckoutLocale } from '../src/core/payment/locale';
import { PayPalProvider } from '../src/core/payment/paypal';
import { PaymentInterval, PaymentType } from '../src/core/payment/types';
import { WaffoProvider } from '../src/core/payment/waffo';

const cases = [
  ['en', 'en-US', 'en'],
  ['de', 'de-DE', 'en'],
  ['fr', 'fr-FR', 'en'],
  ['es', 'es-ES', 'es-MX'],
  ['pt-BR', 'pt-BR', 'pt-BR'],
] as const;
const settings = JSON.parse(
  readFileSync(
    new URL('../project.inlang/settings.json', import.meta.url),
    'utf8'
  )
);
assert.deepEqual(
  cases.map(([locale]) => locale).sort(),
  [...settings.locales].sort()
);
for (const invalid of [
  undefined,
  null,
  {},
  [],
  42,
  'auto',
  'zh-CN',
  '__proto__',
]) {
  assert.equal(normalizeCheckoutLocale(invalid), 'en');
}
assert.equal(normalizeCheckoutLocale('pt-br'), 'pt-BR');

const requests: { path: string; body: any }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(init?.method, 'POST');
  if (url.pathname === '/v1/oauth2/token') {
    assert.equal(url.origin, 'https://api-m.sandbox.paypal.com');
    return Response.json({ access_token: 'offline-token', expires_in: 3600 });
  }
  const body = JSON.parse(String(init?.body));
  requests.push({ path: url.pathname, body });
  switch (url.pathname) {
    case '/v2/checkout/orders':
    case '/v1/billing/subscriptions':
      assert.equal(url.origin, 'https://api-m.sandbox.paypal.com');
      return Response.json({
        id: 'offline-order',
        links: [
          {
            rel: 'approve',
            href: 'https://www.sandbox.paypal.com/checkoutnow?token=offline-order&locale.x=zh_CN',
          },
        ],
      });
    case '/v1/catalogs/products':
    case '/v1/billing/plans':
      return Response.json({ id: 'offline-product-or-plan' });
    case '/v1/actions/auth/issue-session-token':
      return Response.json({ data: { token: 'offline-token' } });
    case '/v1/actions/checkout/create-session':
      return Response.json({
        data: {
          sessionId: 'offline-session',
          checkoutUrl: 'https://example.test/checkout',
        },
      });
    default:
      throw new Error(`Unexpected HTTP request: ${url.pathname}`);
  }
};

try {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  const paypal = new PayPalProvider({
    clientId: 'offline',
    clientSecret: 'offline',
  });
  const waffo = new WaffoProvider({
    merchantId: 'MER_0000000000000000000000',
    privateKey,
  });
  const order = {
    orderNo: 'LOCALE-TEST',
    productId: 'PROD_0000000000000000000000',
    type: PaymentType.ONE_TIME,
    price: { amount: 990, currency: 'usd' },
    description: 'One video',
    customer: { email: 'buyer@example.test', name: 'Test Buyer' },
    successUrl: 'https://example.test/callback',
    cancelUrl: 'https://example.test/pricing',
    metadata: { userId: 'offline-buyer' },
  };

  for (const [locale, paypalLocale, waffoLanguage] of [
    ...cases,
    [undefined, 'en-US', 'en'],
    ['zh-CN', 'en-US', 'en'],
    ['pt-br', 'pt-BR', 'pt-BR'],
  ] as const) {
    const pp = await paypal.createPayment({ order: { ...order, locale } });
    const ppBody = requests.at(-1)!.body;
    assert.equal(ppBody.application_context.locale, paypalLocale);
    assert.equal(ppBody.application_context.return_url, order.successUrl);
    assert.equal(ppBody.application_context.cancel_url, order.cancelUrl);
    assert.equal(ppBody.application_context.user_action, 'PAY_NOW');
    assert.equal(ppBody.purchase_units[0].amount.value, '9.90');
    const approvalUrl = new URL(pp.checkoutInfo.checkoutUrl);
    assert.equal(approvalUrl.origin, 'https://www.sandbox.paypal.com');
    assert.equal(approvalUrl.pathname, '/checkoutnow');
    assert.equal(approvalUrl.searchParams.get('token'), 'offline-order');
    assert.equal(
      approvalUrl.searchParams.get('locale.x'),
      paypalLocale.replace('-', '_')
    );
    assert.equal(approvalUrl.searchParams.has('country.x'), false);

    const wf = await waffo.createPayment({ order: { ...order, locale } });
    const wfBody = requests.findLast((r) =>
      r.path.endsWith('/checkout/create-session')
    )!.body;
    assert.equal(wfBody.language, waffoLanguage);
    assert.equal(wfBody.currency, 'USD');
    assert.equal(wfBody.priceSnapshot.amount, '9.90');
    assert.equal(wfBody.successUrl, order.successUrl);
    assert.equal(wfBody.orderMerchantExternalId, order.orderNo);
    assert.equal(
      wf.checkoutInfo.checkoutUrl,
      'https://example.test/checkout#token=offline-token'
    );
  }

  const subscription = await paypal.createPayment({
    order: {
      ...order,
      locale: 'fr',
      type: PaymentType.SUBSCRIPTION,
      plan: { name: 'Legacy plan', interval: PaymentInterval.MONTH },
    },
  });
  assert.equal(requests.at(-1)!.body.application_context.locale, 'fr-FR');
  assert.equal(
    new URL(subscription.checkoutInfo.checkoutUrl).searchParams.get('locale.x'),
    'fr_FR'
  );
  console.log(
    'PASS: all site languages, invalid/missing locale fallback, PayPal and Waffo HTTP payloads, prices and callbacks.'
  );
} finally {
  globalThis.fetch = realFetch;
}
