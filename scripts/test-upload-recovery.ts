import assert from 'node:assert/strict';

import {
  apiUpload,
  apiUploadImages,
  MediaUploadError,
} from '../src/lib/api-client';
import {
  readSessionValue,
  removeSessionValue,
  writeSessionValue,
} from '../src/lib/browser-session';
import {
  mediaFileBytes,
  MediaFileUnavailableError,
  restoreMediaFile,
  stabilizeMediaFile,
} from '../src/lib/media-file';

// A picker stops being readable after navigation. Its eagerly copied bytes
// must still upload and round-trip through an IDB-compatible structured clone.
const picker = new File(['photo-bytes'], 'photo.jpg', { type: 'image/jpeg' });
const stable = await stabilizeMediaFile(picker);
Object.defineProperty(picker, 'arrayBuffer', {
  value: async () => {
    throw new DOMException('Picker permission expired', 'NotReadableError');
  },
});
const stored = structuredClone(await mediaFileBytes(stable));
assert.equal(await restoreMediaFile(stored).text(), 'photo-bytes');
assert.equal((await stabilizeMediaFile(picker)).size, stable.size);
const unreadable = new File(['lost'], 'lost.jpg');
Object.defineProperty(unreadable, 'arrayBuffer', {
  value: async () => {
    throw new DOMException('Gone', 'NotFoundError');
  },
});
await assert.rejects(stabilizeMediaFile(unreadable), MediaFileUnavailableError);

const originalFetch = globalThis.fetch;
const originalTimeout = globalThis.setTimeout;
const bodies: FormData[] = [];
let attempts = 0;
// Keep the retry semantics without making the offline test wait for backoff.
globalThis.setTimeout = ((
  fn: (...args: unknown[]) => void,
  delay: number,
  ...args: unknown[]
) =>
  originalTimeout(fn, delay < 10000 ? 0 : delay, ...args)) as typeof setTimeout;
try {
  globalThis.fetch = async (_url, init) => {
    attempts++;
    const body = init!.body as FormData;
    bodies.push(body);
    const files = body.getAll('files') as File[];
    assert.equal(await files[0].text(), 'photo-bytes');
    if (attempts === 1) throw new TypeError('Failed to fetch');
    if (attempts === 2)
      return Response.json(
        { code: -1, message: 'Upload failed' },
        { status: 503 }
      );
    return Response.json({
      code: 0,
      data: { urls: ['https://media.example/photo.jpg'] },
    });
  };
  assert.equal(
    (await apiUpload<{ urls: string[] }>('/api/storage/upload-image', stable))
      .urls.length,
    1
  );
  assert.equal(attempts, 3);
  assert.notEqual(bodies[0], bodies[1]);
  assert.notEqual(bodies[1], bodies[2]);

  attempts = 0;
  globalThis.fetch = async () => {
    attempts++;
    return Response.json(
      { code: -1, message: 'Unsupported image' },
      { status: 413 }
    );
  };
  await assert.rejects(
    apiUpload('/api/storage/upload-image', stable),
    (error: unknown) =>
      error instanceof MediaUploadError && error.attempts === 1
  );
  assert.equal(attempts, 1);

  attempts = 0;
  globalThis.fetch = async () => {
    attempts++;
    throw new TypeError('Failed to fetch');
  };
  await assert.rejects(
    apiUpload('/api/storage/upload-image', stable),
    (error: unknown) =>
      error instanceof MediaUploadError && error.attempts === 3
  );
  assert.equal(attempts, 3);

  attempts = 0;
  globalThis.fetch = async (_url, init) => {
    attempts++;
    assert.equal((init!.body as FormData).getAll('files').length, 2);
    return Response.json({ code: 0, data: { urls: ['a', 'b'] } });
  };
  await apiUploadImages([stable, stable]);
  assert.equal(attempts, 1);
  await assert.rejects(
    apiUpload('/api/storage/upload-image', unreadable),
    MediaFileUnavailableError
  );
  assert.equal(
    attempts,
    1,
    'Unreadable files must fail before sending a request'
  );
} finally {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalTimeout;
}

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  get() {
    throw new DOMException('Denied', 'SecurityError');
  },
});
assert.equal(writeSessionValue('qa-submit', 'same-request-id'), false);
assert.equal(readSessionValue('qa-submit'), 'same-request-id');
removeSessionValue('qa-submit');
assert.equal(readSessionValue('qa-submit'), null);
console.log(
  'PASS: expired picker recovery, binary draft round trip, bounded upload retries, validation errors, batched photos, denied session storage.'
);
