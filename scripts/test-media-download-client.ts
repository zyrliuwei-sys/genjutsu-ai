import assert from 'node:assert/strict';

import { apiDownload } from '../src/lib/api-client';

const originalFetch = globalThis.fetch;
const originalDocument = globalThis.document;
const originalTimeout = globalThis.setTimeout;
let clicks = 0;
let filename = '';
let timers = 0;
Object.assign(globalThis, {
  document: {
    createElement() {
      return {
        href: '',
        set download(value: string) {
          filename = value;
        },
        click() {
          clicks++;
        },
        remove() {},
      };
    },
    body: { appendChild() {} },
  },
});
globalThis.fetch = async () =>
  Response.json({ message: 'Unauthorized' }, { status: 401 });
await assert.rejects(
  apiDownload('/api/studio/download?id=test'),
  /Unauthorized/
);
globalThis.fetch = async () =>
  Response.json({ message: 'Saving failed' }, { status: 503 });
await assert.rejects(
  apiDownload('/api/studio/download?id=test'),
  /Saving failed/
);
assert.equal(clicks, 0);
globalThis.fetch = async () =>
  new Response(new Uint8Array([1, 2, 3]), {
    headers: {
      'content-type': 'video/mp4',
      'content-disposition': 'attachment; filename="genjutsu-test.mp4"',
    },
  });
globalThis.setTimeout = ((callback: () => void) => {
  timers++;
  callback();
  return 0;
}) as unknown as typeof setTimeout;
await apiDownload('/api/studio/download?id=test');
assert.equal(clicks, 1);
assert.equal(filename, 'genjutsu-test.mp4');
assert.equal(timers, 1);
globalThis.fetch = originalFetch;
globalThis.document = originalDocument;
globalThis.setTimeout = originalTimeout;
console.log(
  'PASS: JSON/401/503 never download; binary saves with the server filename.'
);
