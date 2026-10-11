import assert from 'node:assert/strict';

import { parallelMediaUpload } from '../src/lib/parallel-media-upload';

let completeImage!: (value: string) => void;
let completeVideo!: (value: string) => void;
const started: string[] = [];
const job = parallelMediaUpload(
  () => {
    started.push('image');
    return new Promise<string>((resolve) => {
      completeImage = resolve;
    });
  },
  () => {
    started.push('video');
    return new Promise<string>((resolve) => {
      completeVideo = resolve;
    });
  }
);
await Promise.resolve();
assert.deepEqual(started, ['image', 'video']);
completeVideo('video');
completeImage('image');
assert.deepEqual(await job, ['image', 'video']);

let resolveRemaining!: (value: string) => void;
let settled = false;
const failed = parallelMediaUpload(
  async () => {
    throw new Error('image upload failed');
  },
  () =>
    new Promise<string>((resolve) => {
      resolveRemaining = resolve;
    })
);
void failed.catch(() => {
  settled = true;
});
await Promise.resolve();
await Promise.resolve();
assert.equal(settled, false);
resolveRemaining('cached successful video');
await assert.rejects(failed, /image upload failed/);
console.log(
  'PASS: parallel transfer starts both jobs and waits for all requests before retry.'
);
