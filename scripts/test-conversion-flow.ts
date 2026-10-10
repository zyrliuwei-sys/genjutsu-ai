// Offline checks only: no real users, payments or paid generation requests.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { genjutsuCredits } from '../src/config/genjutsu';
import { PRACTICE_SAMPLES } from '../src/config/practice-media';
import { pricingCatalog } from '../src/config/pricing';
import { apiPublicFile } from '../src/lib/api-client';
import { funnelPayload, trackFunnelEvent } from '../src/lib/funnel';
import { purchaseGuidance } from '../src/lib/purchase-guidance';
import { mp4Duration } from '../src/lib/video-duration';

const short = purchaseGuidance(genjutsuCredits(5), 0);
assert.equal(short.recommended, 'pack_starter');
assert.equal(short.coversClip('pack_starter'), true);
const long = purchaseGuidance(genjutsuCredits(9), 0);
assert.equal(long.recommended, 'pack_creator');
assert.equal(long.coversClip('pack_starter'), false);
assert.equal(
  purchaseGuidance(genjutsuCredits(9), 620).recommended,
  'pack_starter'
);
assert.equal(purchaseGuidance(genjutsuCredits(5), 620).recommended, undefined);
assert.deepEqual(
  ['pack_starter', 'pack_creator', 'pack_pro'].map((id) => [
    pricingCatalog[id].priceInCents,
    pricingCatalog[id].credits,
  ]),
  [
    [690, 620],
    [2490, 2480],
    [4990, 4960],
  ]
);
const duration = mp4Duration(
  new Uint8Array(await readFile(`public${PRACTICE_SAMPLES[0].video}`))
);
assert.ok(duration >= 3 && duration <= 5, `Practice clip is ${duration}s`);
assert.equal(genjutsuCredits(duration), 620);
assert.equal(PRACTICE_SAMPLES.length, 4);
assert.equal(new Set(PRACTICE_SAMPLES.map((sample) => sample.video)).size, 4);
assert.equal(new Set(PRACTICE_SAMPLES.map((sample) => sample.image)).size, 4);
assert.equal(
  new Set(PRACTICE_SAMPLES.map((sample) => sample.direction)).size,
  4
);
for (const sample of PRACTICE_SAMPLES) {
  const seconds = mp4Duration(
    new Uint8Array(await readFile(`public${sample.video}`))
  );
  assert.ok(seconds >= 3 && seconds <= 5, `${sample.id}: ${seconds}s`);
  assert.equal(genjutsuCredits(seconds), 620);
  assert.ok(sample.width >= 720 && sample.height >= 720);
  await readFile(`public${sample.image}`);
  await readFile(`public${sample.poster}`);
  assert.ok(sample.video.startsWith('/videos/genjutsu-practice/'));
  assert.ok(!sample.video.includes('higgsfield'));
}

// Regress the shared client's media directory allowlist, without networking.
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(new Uint8Array([1, 2, 3]));
try {
  for (const sample of PRACTICE_SAMPLES) {
    const file = await apiPublicFile(
      sample.video,
      `${sample.id}.mp4`,
      'video/mp4'
    );
    assert.equal(file.size, 3);
    assert.equal(file.type, 'video/mp4');
  }
  await assert.rejects(
    apiPublicFile('/videos/other/example.mp4', 'x.mp4', 'video/mp4')
  );
  await assert.rejects(
    apiPublicFile(
      '/videos/genjutsu-practice/../private.mp4',
      'x.mp4',
      'video/mp4'
    )
  );
} finally {
  globalThis.fetch = originalFetch;
}

assert.deepEqual(
  funnelPayload({
    surface: 'create',
    product_id: 'pack_starter',
    value: 6.9,
    required_generations: 1,
  }),
  {
    surface: 'create',
    product_id: 'pack_starter',
    value: 6.9,
    currency: 'USD',
    required_generations: 1,
  }
);
assert.deepEqual(
  funnelPayload({
    surface: 'private@example.com',
    product_id: 'email@example.com',
    transaction_id: 'private@example.com',
    value: NaN,
    required_generations: 999,
    prompt: 'private prompt',
    filename: 'private.jpg',
  } as never),
  {}
);
const events: unknown[][] = [];
Object.assign(globalThis, {
  window: {
    location: {
      origin: 'https://example.test',
      pathname: '/create',
      search: '?prompt=private',
    },
    gtag: (...args: unknown[]) => events.push(args),
  },
  document: { referrer: 'https://referrer.test/?email=private' },
});
assert.equal(trackFunnelEvent('begin_checkout', {}, false), false);
assert.equal(events.length, 0, 'Excluded traffic must not be tracked');
assert.equal(
  trackFunnelEvent('begin_checkout', { product_id: 'pack_starter' }, true),
  true
);
assert.equal(JSON.stringify(events).includes('private'), false);
assert.equal(
  trackFunnelEvent(
    'purchase',
    { transaction_id: 'order_123', value: 6.9 },
    true
  ),
  true
);
Object.assign(globalThis, {
  window: {
    location: { origin: 'https://example.test', pathname: '/' },
    gtag: () => {
      throw new Error('analytics blocked');
    },
  },
});
assert.equal(
  trackFunnelEvent('studio_view', {}, true),
  false,
  'Analytics errors must be non-blocking'
);
console.log(
  'PASS: unchanged prices, duration-aware pack guidance, one-generation practice video, PII allowlist, excluded traffic and non-blocking analytics.'
);
