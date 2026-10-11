import assert from 'node:assert/strict';

import { referenceVideoPlan } from '../src/lib/reference-video-plan';

for (const [width, height, expected] of [
  [360, 640, [720, 1280]],
  [640, 360, [1280, 720]],
  [1920, 1080, [1920, 1080]],
  [1080, 1920, [1080, 1920]],
  [3840, 2160, [2160, 1216]],
  [2160, 3840, [1216, 2160]],
  [719, 1280, [720, 1282]],
  [3000, 400, [2160, 864]],
  [400, 3000, [864, 2160]],
] as const) {
  const plan = referenceVideoPlan(width, height);
  assert.deepEqual([plan.width, plan.height], expected);
  assert.equal(
    plan.needsResize,
    width !== plan.width || height !== plan.height
  );
  assert.ok(plan.width >= 720 && plan.width <= 2160);
  assert.ok(plan.height >= 720 && plan.height <= 2160);
  assert.equal(plan.width % 2, 0);
  assert.equal(plan.height % 2, 0);
  assert.ok(plan.filter.includes('force_original_aspect_ratio=decrease'));
}
assert.throws(() => referenceVideoPlan(0, 720));
assert.throws(() => referenceVideoPlan(Number.NaN, 720));
console.log(
  'PASS: low-resolution, 4K, odd dimensions, landscape/portrait and padded extremes.'
);
