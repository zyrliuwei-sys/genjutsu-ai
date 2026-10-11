import assert from 'node:assert/strict';

import { genjutsuCredits, genjutsuReadiness } from '../src/config/genjutsu';
import {
  MAX_REFERENCE_VIDEO_BYTES,
  middleClipPlan,
} from '../src/lib/video-trim-plan';

assert.equal(MAX_REFERENCE_VIDEO_BYTES, 30 * 1024 * 1024);
assert.deepEqual(middleClipPlan(60, 5), { start: 27.5, duration: 5 });
assert.deepEqual(middleClipPlan(60, 10), { start: 25, duration: 10 });
assert.deepEqual(middleClipPlan(7, 10), { start: 0, duration: 7 });
assert.deepEqual(middleClipPlan(3, 5), { start: 0, duration: 3 });
for (const invalid of [0, 2.9, NaN, Infinity])
  assert.throws(() => middleClipPlan(invalid, 5));
assert.equal(genjutsuCredits(middleClipPlan(60, 5).duration), 620);
assert.equal(genjutsuCredits(middleClipPlan(60, 10).duration), 1240);
assert.equal(
  genjutsuReadiness({ evolink_api_key: 'offline-placeholder' }).maxVideoMB,
  30
);
assert.equal(
  genjutsuReadiness({ fal_api_key: 'offline-placeholder' }).maxVideoMB,
  30
);
console.log(
  'Middle clip selection, minimum length, 30MB limit and 5s/10s pricing passed.'
);
