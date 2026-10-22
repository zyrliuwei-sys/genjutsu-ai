import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { CREDIT_UNIT } from '../src/config/credit-pricing';
import {
  GENJUTSU_CREDITS_PER_GENERATION,
  GENJUTSU_USD_PER_SECOND,
  genjutsuCredits,
  genjutsuGenerations,
} from '../src/config/genjutsu';
import { getPricingProduct, pricingCatalog } from '../src/config/pricing';
import { CreemProvider } from '../src/core/payment/creem';
import { PaymentType } from '../src/core/payment/types';
import { mp4Duration } from '../src/lib/video-duration';

assert.equal(genjutsuCredits(3), 700);
assert.equal(genjutsuCredits(5), 700);
assert.equal(genjutsuCredits(10), 1400);
assert.throws(() => genjutsuCredits(NaN));
assert.throws(() => genjutsuCredits(2.9));
assert.throws(() => genjutsuCredits(11));
assert.equal(genjutsuGenerations(5), 1);
assert.equal(genjutsuGenerations(5.01), 2);
assert.equal(genjutsuGenerations(10), 2);
for (let seconds = 3; seconds <= 10; seconds += 0.1) {
  assert.ok(
    genjutsuCredits(seconds) * 0.01 + 1e-9 >=
      GENJUTSU_USD_PER_SECOND * seconds * 7
  );
}
const packs = Object.values(pricingCatalog).filter(
  (p) => p.productId.startsWith('pack_') && p.available !== false
);
assert.deepEqual(
  packs.map((p) => [p.priceInCents, p.credits]),
  [
    [990, 1050],
    [1990, 2100],
    [4990, 5950],
  ]
);
for (const id of ['pack_studio', 'pack_duo', 'pack_creator'])
  assert.equal(getPricingProduct(id), null);
assert.equal(GENJUTSU_CREDITS_PER_GENERATION % CREDIT_UNIT, 0);
for (const product of packs) {
  // Whole $3.50 units so any balance can be spent down to zero.
  assert.equal(product.credits % CREDIT_UNIT, 0);
  assert.ok(product.priceInCents >= 990);
  assert.ok(product.credits >= product.priceInCents);
  assert.equal(product.bonusCredits, product.credits - product.priceInCents);
  // Bonus balance may dilute the 7× list markup, never below 5.5×.
  const units = product.credits / GENJUTSU_CREDITS_PER_GENERATION;
  assert.ok(
    product.priceInCents / 100 / units >= GENJUTSU_USD_PER_SECOND * 5 * 5.5
  );
}
const video = new Uint8Array(
  await readFile('public/videos/higgsfield-reference/dream.mp4')
);
assert.ok(Math.abs(mp4Duration(video) - 9.041667) < 0.002);
assert.throws(() => mp4Duration(new Uint8Array(12)));
process.env.AUTH_SECRET = 'offline-only-signing-test-no-real-credential';
const { signVideoReceipt, verifyVideoReceipt } =
  await import('../src/lib/video-receipt.server');
const url = 'https://media.example.test/video.mp4';
const receipt = await signVideoReceipt(url, 5, 'test-user');
assert.equal(await verifyVideoReceipt(receipt, url, 'test-user'), 5);
const portraitReceipt = await signVideoReceipt(url, 5, 'test-user', {
  width: 720,
  height: 1280,
});
assert.equal(
  await verifyVideoReceipt(portraitReceipt, url, 'test-user', '9:16'),
  5
);
await assert.rejects(
  verifyVideoReceipt(portraitReceipt, url, 'test-user', '16:9'),
  /ratio/
);
await assert.rejects(
  verifyVideoReceipt(receipt, url, 'test-user', '9:16'),
  /ratio/
);
await assert.rejects(verifyVideoReceipt(receipt, url, 'another-user'));
await assert.rejects(
  verifyVideoReceipt(
    {
      ...receipt,
      payload: receipt.payload.replace('"duration":5', '"duration":3'),
    },
    url,
    'test-user'
  )
);
await assert.rejects(
  verifyVideoReceipt(
    receipt,
    'https://media.example.test/other.mp4',
    'test-user'
  )
);
const originalFetch = globalThis.fetch;
try {
  const calls: string[] = [];
  let productPrice = 990;
  globalThis.fetch = async (input, init) => {
    calls.push(`${init?.method} ${input}`);
    return Response.json(
      String(input).includes('/v1/products?')
        ? { price: productPrice, currency: 'USD' }
        : {
            id: 'offline-checkout',
            checkout_url: 'https://checkout.example.test',
          }
    );
  };
  const provider = new CreemProvider({
    apiKey: 'offline-placeholder',
    environment: 'sandbox',
  });
  const order = {
    productId: 'prod_offline',
    price: { amount: 690, currency: 'usd' },
    type: PaymentType.ONE_TIME,
  };
  await assert.rejects(
    provider.createPayment({ order }),
    /price does not match/
  );
  assert.equal(
    calls.length,
    1,
    'Wrong-priced product must never create a checkout'
  );
  productPrice = 690;
  const checkout = await provider.createPayment({ order });
  assert.equal(checkout.checkoutInfo.sessionId, 'offline-checkout');
  assert.ok(calls.at(-1)?.startsWith('POST '));
} finally {
  globalThis.fetch = originalFetch;
}
console.log(
  'PASS: 1/2 generation units, three exact packs in $3.50 units, retired pack, signed duration and Creem checkout price guard'
);
