import assert from 'node:assert/strict';

import { paymentOptions } from '../src/lib/payment-options';

const configured = {
  waffo_enabled: 'true',
  paypal_enabled: 'true',
  stripe_enabled: 'false',
  select_payment_enabled: 'true',
  default_payment_provider: 'paypal',
};
assert.deepEqual(paymentOptions(configured), ['waffo', 'paypal']);
assert.deepEqual(
  paymentOptions({ ...configured, select_payment_enabled: 'false' }),
  ['paypal']
);
assert.deepEqual(paymentOptions({ ...configured, paypal_enabled: 'false' }), [
  'waffo',
]);
assert.deepEqual(
  paymentOptions({
    ...configured,
    select_payment_enabled: 'false',
    default_payment_provider: 'stripe',
  }),
  ['waffo']
);
assert.deepEqual(
  paymentOptions({}),
  [],
  'No configured methods must never invent a Stripe fallback'
);
assert.deepEqual(
  paymentOptions({
    paypal_enabled: 'true',
    select_payment_enabled: 'true',
    unknown_enabled: 'true',
  }),
  ['paypal']
);
assert.deepEqual(
  paymentOptions({
    waffo_enabled: 'false',
    paypal_enabled: 'false',
    default_payment_provider: 'waffo',
  }),
  []
);
assert.deepEqual(paymentOptions({ ...configured, waffo_enabled: 'TRUE' }), [
  'paypal',
]);
console.log(
  'PASS: direct payment options honor enabled methods, default provider, selection setting, card ordering, and unavailable configuration.'
);
