import assert from 'node:assert/strict';

import {
  getPricingProduct,
  pricingCatalog,
  singleVideoProduct,
} from '../src/config/pricing';
import { seedanceVideoRequest } from '../src/config/seedance-frames';
import {
  getStudioModel,
  STUDIO_ASPECTS,
  studioCredits,
  VIDEO_DURATIONS,
  VIDEO_RESOLUTIONS,
} from '../src/config/studio-models';
import { EvolinkProvider } from '../src/core/ai/evolink';

const model = getStudioModel('seedance-2')!;
const frameModel = getStudioModel('seedance-2-image')!;
const frames = [
  'https://media.example.test/first.jpg',
  'https://media.example.test/last.jpg',
];
const frameOptions = {
  duration: 10 as const,
  resolution: '720p' as const,
  aspect: '16:9' as const,
};
for (const count of [1, 2]) {
  const payload = seedanceVideoRequest(
    frameModel,
    'A cinematic transition',
    frameOptions,
    frames.slice(0, count)
  );
  assert.equal(payload.model, 'seedance-2.0-image-to-video');
  assert.deepEqual(payload.image_urls, frames.slice(0, count));
  assert.equal(payload.duration, 10);
  assert.equal(payload.content_filter, true);
}
assert.throws(() => seedanceVideoRequest(frameModel, 'test', frameOptions, []));
assert.throws(() =>
  seedanceVideoRequest(frameModel, 'test', frameOptions, [...frames, frames[0]])
);
assert.throws(() => seedanceVideoRequest(model, 'test', frameOptions, frames));
for (const duration of VIDEO_DURATIONS) {
  for (const resolution of VIDEO_RESOLUTIONS) {
    for (const aspect of STUDIO_ASPECTS) {
      const options = { duration, resolution, aspect };
      const product = singleVideoProduct(options);
      assert.equal(product.credits, studioCredits(model, options));
      assert.equal(product.priceInCents, product.credits);
      assert.equal(
        getPricingProduct(product.productId),
        null,
        'Per-video checkout is retired; use shared packs'
      );
      const apiCost = model.usdPerSecond![resolution]! * duration;
      assert.equal(
        studioCredits(getStudioModel('seedance-2-image')!, options),
        product.credits
      );
      assert.ok(product.priceInCents / 100 >= apiCost * 7);
      assert.equal(product.credits % 350, 0);
      for (const pack of Object.values(pricingCatalog).filter(
        (p) => p.productId.startsWith('pack_') && p.available !== false
      )) {
        // Pack bonuses dilute the 7× list markup, never below 5.5×.
        assert.ok(
          (product.credits * pack.priceInCents) / pack.credits / 100 >=
            apiCost * 5.5
        );
      }
    }
  }
}
assert.equal(
  singleVideoProduct({ duration: 5, resolution: '480p', aspect: '9:16' })
    .priceInCents,
  350
);
for (const id of [
  'video_seedance2_4k_5',
  'video_seedance2_480p_30',
  'video_seedance2_480p_5?price=1',
  'video_seedance2_480p_05',
])
  assert.equal(getPricingProduct(id), null);
const originalFetch = globalThis.fetch;
try {
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    calls++;
    assert.equal(String(input), 'https://api.evolink.ai/v1/videos/generations');
    assert.equal(init?.method, 'POST');
    const payload = JSON.parse(String(init?.body));
    assert.deepEqual(payload, {
      model: 'seedance-2.0-text-to-video',
      prompt: 'A cinematic mountain sunrise',
      duration: 10,
      quality: '720p',
      aspect_ratio: '16:9',
      generate_audio: true,
      content_filter: true,
    });
    return Response.json({ id: 'offline-seed-task', status: 'pending' });
  };
  const id = await new EvolinkProvider({
    apiKey: 'offline-test-only',
  }).createVideo({
    model: model.endpoint,
    prompt: 'A cinematic mountain sunrise',
    duration: 10,
    quality: '720p',
    aspect_ratio: '16:9',
    generate_audio: true,
    content_filter: true,
  });
  assert.equal(id, 'offline-seed-task');
  assert.equal(calls, 1);
} finally {
  globalThis.fetch = originalFetch;
}
console.log(
  'PASS: 18 text-video choices, $3.50 units, ≥7× per charge and ≥5.5× after pack bonus, invalid IDs, Seedance request payload (offline)'
);
