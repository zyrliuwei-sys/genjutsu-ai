import assert from 'node:assert/strict';

import {
  checkoutReturnPath,
  checkoutReturnTarget,
  paymentReturnUrls,
  withoutCheckoutReturn,
} from '../src/lib/checkout-return';

const base = 'https://genjutsu.example';
for (const locale of ['', '/de', '/fr', '/es', '/pt-br']) {
  const source = `${locale}/create?effect=dime-black-shirt#generator`;
  const cancel = checkoutReturnPath(source, 'genjutsu');
  assert.equal(checkoutReturnTarget(new URL(cancel, base)), 'genjutsu');
  assert.equal(withoutCheckoutReturn(cancel), source);
  const urls = paymentReturnUrls(base, source, cancel);
  assert.equal(urls.cancelUrl, base + cancel);
  assert.equal(
    new URL(urls.successUrl).searchParams.get('redirect'),
    base + source
  );
  assert.equal(
    new URL(
      paymentReturnUrls(base, cancel, cancel).successUrl
    ).searchParams.get('redirect'),
    base + source,
    'A successful payment must not reopen the unpaid return panel'
  );
}
assert.equal(
  checkoutReturnPath('/?utm_source=search', 'pricing'),
  '/?utm_source=search&checkout_return=pricing#pricing'
);
assert.equal(
  checkoutReturnTarget(new URL('/?checkout_return=unknown', base)),
  null
);
assert.equal(
  checkoutReturnPath('/create?checkout_return=pricing', 'text-video'),
  '/create?checkout_return=text-video'
);

for (const invalid of [
  undefined,
  null,
  {},
  [],
  42,
  'https://evil.example/path',
  '//evil.example/path',
  '/\\evil.example',
  'javascript:alert(1)',
  'https://genjutsu.example@evil.example/',
]) {
  const urls = paymentReturnUrls(base, invalid, invalid);
  assert.equal(urls.cancelUrl, base + '/pricing');
  assert.equal(
    new URL(urls.successUrl).searchParams.get('redirect'),
    base + '/settings/billing'
  );
}
for (const path of ['/create?effect=cat', '//evil.example/path']) {
  const sameOrigin = base + path;
  const urls = paymentReturnUrls(base, sameOrigin, sameOrigin);
  assert.equal(new URL(urls.cancelUrl).origin, base);
  assert.equal(
    new URL(new URL(urls.successUrl).searchParams.get('redirect')!).origin,
    base
  );
}
console.log(
  'PASS: canceled and successful checkout destinations, all locales, pricing anchors, and hostile redirects.'
);
