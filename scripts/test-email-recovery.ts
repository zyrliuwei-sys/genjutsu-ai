// Exercise signed email links against an in-memory DB. No provider calls,
// real signing keys, emails, or production orders are used.
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';

import { envConfigs } from '../src/config/index';
import { mutableResponse } from '../src/lib/mutable-response';

envConfigs.database_provider = 'sqlite';
envConfigs.database_url = 'file::memory:';
envConfigs.database_auth_token = '';
envConfigs.auth_secret = randomUUID();
envConfigs.app_url = 'https://example.test';

const { db } = await import('../src/core/db');
const client = db().$client;
await client.executeMultiple(`
  CREATE TABLE funnel_event (
    id TEXT PRIMARY KEY, event TEXT NOT NULL, user_id TEXT, anon_id TEXT,
    path TEXT, props TEXT, created_at INTEGER NOT NULL DEFAULT 0
  );
`);
const { Route } = await import('../src/routes/api/email/recovery');
const handlers = Route.options.server!.handlers as {
  GET: (context: { request: Request }) => Promise<Response>;
  POST: (context: { request: Request }) => Promise<Response>;
};

function signedToken(action: 'click' | 'unsub') {
  const payload = `test-user.test-order.${action}`;
  const signature = createHmac('sha256', envConfigs.auth_secret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

async function countEvents(event: string) {
  const result = await client.execute({
    sql: 'SELECT COUNT(*) AS total FROM funnel_event WHERE event = ?',
    args: [event],
  });
  return Number(result.rows[0].total);
}

const clickRequest = new Request(
  `https://example.test/api/email/recovery?t=${signedToken('click')}`
);
const redirect = await handlers.GET({ request: clickRequest });
assert.equal(redirect.status, 302);
// This is the original failure in src/server.ts after the handler returned.
assert.throws(
  () => redirect.headers.set('X-Content-Type-Options', 'nosniff'),
  TypeError
);
const result = mutableResponse(redirect);
result.headers.set('X-Content-Type-Options', 'nosniff');
result.headers.append(
  'Set-Cookie',
  'utm_source=recovery_email; Path=/; Secure'
);
assert.equal(result.status, 302);
assert.equal(
  result.headers.get('Location'),
  'https://example.test/pricing?utm_source=recovery_email'
);
assert.equal(result.headers.get('X-Content-Type-Options'), 'nosniff');
assert.equal(await result.text(), '');
assert.equal(await countEvents('recovery_email_click'), 1);

const invalid = mutableResponse(
  await handlers.GET({
    request: new Request(`${clickRequest.url}tampered`),
  })
);
invalid.headers.set('X-Content-Type-Options', 'nosniff');
assert.equal(invalid.status, 400);
assert.match(invalid.headers.get('Content-Type')!, /text\/html; charset=utf-8/);
assert.match(await invalid.text(), /This link is not valid/);
assert.equal(await countEvents('recovery_email_click'), 1);

// Mail scanners following unsubscribe links must not unsubscribe the user.
const unsubscribeUrl = `https://example.test/api/email/recovery?t=${signedToken('unsub')}`;
const confirm = await handlers.GET({ request: new Request(unsubscribeUrl) });
assert.equal(confirm.status, 200);
assert.match(await confirm.text(), /form method="post"/);
assert.equal(await countEvents('email_unsubscribe'), 0);
for (let i = 0; i < 2; i++) {
  const response = mutableResponse(
    await handlers.POST({
      request: new Request(unsubscribeUrl, { method: 'POST' }),
    })
  );
  response.headers.set('X-Content-Type-Options', 'nosniff');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /You're unsubscribed/);
}
assert.equal(await countEvents('email_unsubscribe'), 1);

// The shared wrapper also handles ordinary streamed pages and auth cookies.
const body = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode('付款重试 ✓'));
    controller.close();
  },
});
const page = new Response(body, {
  status: 201,
  statusText: 'Created',
  headers: [
    ['Content-Type', 'text/html; charset=utf-8'],
    ['Set-Cookie', 'session=example; Path=/; HttpOnly'],
    ['Set-Cookie', 'locale=en; Path=/'],
  ],
});
const wrapped = mutableResponse(page);
assert.equal(
  wrapped.body,
  body,
  'Keep streaming rather than buffering or teeing'
);
wrapped.headers.set('X-Content-Type-Options', 'nosniff');
assert.equal(wrapped.status, 201);
assert.equal(wrapped.statusText, 'Created');
assert.deepEqual(wrapped.headers.getSetCookie(), page.headers.getSetCookie());
assert.equal(page.headers.get('X-Content-Type-Options'), null);
assert.equal(await wrapped.text(), '付款重试 ✓');
assert.equal(mutableResponse(new Response(null, { status: 204 })).status, 204);

console.log(
  'PASS: signed recovery redirects, mutable security headers, invalid links, safe unsubscribe, streamed UTF-8 responses and auth cookies.'
);
client.close();
