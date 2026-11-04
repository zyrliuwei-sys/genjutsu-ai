import assert from 'node:assert/strict';

import { PUBLIC_PAGE_PATHS } from '../src/config/public-pages';
import { canonicalPagePath } from '../src/lib/canonical-page-path';

for (const prefix of ['', '/de', '/fr', '/es', '/pt-br']) {
  for (const path of PUBLIC_PAGE_PATHS.filter(Boolean)) {
    const canonical = `${prefix}${path}`;
    assert.equal(canonicalPagePath(canonical), canonical);
    assert.equal(canonicalPagePath(`${canonical}/`), canonical);
  }
}
for (const path of [
  '/',
  '/de/',
  '/fr/',
  '/es/',
  '/pt-br/',
  '/api/payment/callback/',
  '/settings/billing/',
  '/videos/effects/',
  '/not-a-page/',
]) {
  assert.equal(canonicalPagePath(path), path, path);
}
assert.equal(canonicalPagePath('/guides/'), '/guides');
console.log(
  'PASS public page slash normalization and protected locale roots/API/app/asset paths'
);
