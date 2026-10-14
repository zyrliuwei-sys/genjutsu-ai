import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { matchesVideoAspect, mp4Dimensions } from '../src/lib/video-dimensions';

function box(type: string, payload: Uint8Array) {
  const bytes = new Uint8Array(payload.length + 8);
  new DataView(bytes.buffer).setUint32(0, bytes.length);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(payload, 8);
  return bytes;
}
function track(width: number, height: number, version = 0, rotate = false) {
  const bytes = new Uint8Array(version ? 96 : 84);
  bytes[0] = version;
  const view = new DataView(bytes.buffer);
  const position = version ? 88 : 76;
  view.setUint32(position, width * 65536);
  view.setUint32(position + 4, height * 65536);
  const matrix = version ? 52 : 40;
  if (rotate) {
    view.setInt32(matrix + 4, 65536);
    view.setInt32(matrix + 12, -65536);
  } else {
    view.setInt32(matrix, 65536);
    view.setInt32(matrix + 16, 65536);
  }
  return box('trak', box('tkhd', bytes));
}
for (const version of [0, 1]) {
  assert.deepEqual(mp4Dimensions(box('moov', track(1280, 720, version))), {
    width: 1280,
    height: 720,
  });
  assert.deepEqual(
    mp4Dimensions(box('moov', track(1280, 720, version, true))),
    { width: 720, height: 1280 }
  );
}
const audio = track(0, 0);
const video = track(720, 1280);
const tracks = new Uint8Array(audio.length + video.length);
tracks.set(audio);
tracks.set(video, audio.length);
assert.deepEqual(mp4Dimensions(box('moov', tracks)), {
  width: 720,
  height: 1280,
});
assert.throws(() => mp4Dimensions(new Uint8Array([0, 1])));
assert.throws(() =>
  mp4Dimensions(new Uint8Array([255, 255, 255, 255, 109, 111, 111, 118]))
);
assert(matchesVideoAspect(1080, 1916, '9:16'));
assert(!matchesVideoAspect(1920, 1080, '9:16'));
assert(!matchesVideoAspect(0, 1080, '16:9'));
assert.deepEqual(
  mp4Dimensions(readFileSync('public/videos/effect-clips/runway-10s.mp4')),
  { width: 1280, height: 720 }
);
console.log(
  'PASS: MP4 v0/v1, audio tracks, rotation, invalid boxes and real reference dimensions.'
);
