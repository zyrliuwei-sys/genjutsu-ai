import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { genjutsuCredits } from '../src/config/genjutsu';
import { readMediaMetadata } from '../src/lib/media-metadata';

// Simulate browsers reporting Infinity for an otherwise valid movie.
const originalDocument = Object.getOwnPropertyDescriptor(
  globalThis,
  'document'
);
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { setTimeout, clearTimeout },
});
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    createElement: () => ({
      videoWidth: 1280,
      videoHeight: 720,
      duration: Infinity,
      onloadedmetadata: () => {},
      set src(_url: string) {
        queueMicrotask(() => this.onloadedmetadata());
      },
      removeAttribute() {},
      load() {},
    }),
  },
});
try {
  for (const [tier, cost] of [
    [5, 620],
    [10, 1240],
  ]) {
    const bytes = await readFile(
      `public/videos/effect-clips/launch-${tier}s.mp4`
    );
    const result = await readMediaMetadata(
      'blob:test',
      'video',
      new Blob([bytes])
    );
    assert.ok(Math.abs(result.duration - tier) < 0.05);
    assert.equal(genjutsuCredits(result.duration), cost);
    assert.equal(result.width, 1280);
  }
  const long = await readFile('public/videos/higgsfield-reference/launch.mp4');
  const result = await readMediaMetadata(
    'blob:test',
    'video',
    new Blob([long])
  );
  assert.ok(result.duration > 59);
  assert.throws(() => genjutsuCredits(result.duration));
  await assert.rejects(
    readMediaMetadata('blob:test', 'video', new Blob(['invalid']))
  );
  console.log(
    'Media metadata: 5s/10s pricing, Infinity fallback, long and invalid files passed'
  );
} finally {
  if (originalDocument)
    Object.defineProperty(globalThis, 'document', originalDocument);
  else Reflect.deleteProperty(globalThis, 'document');
  if (originalWindow)
    Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
}
