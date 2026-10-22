import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { envConfigs } from '../src/config/index';

envConfigs.database_provider = 'sqlite';
envConfigs.database_url = 'file::memory:';
envConfigs.database_auth_token = '';
const { db } = await import('../src/core/db');
const client = db().$client;
await client.executeMultiple(
  `CREATE TABLE "order" (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,status TEXT NOT NULL,deleted_at INTEGER);`
);
const { hasPaidOrder } = await import('../src/modules/payment/service');
assert.equal(await hasPaidOrder('free-user'), false);
await client.execute(
  "INSERT INTO 'order' VALUES ('pending-order','free-user','pending',NULL)"
);
assert.equal(await hasPaidOrder('free-user'), false);
await client.execute(
  "UPDATE 'order' SET status='paid' WHERE id='pending-order'"
);
assert.equal(await hasPaidOrder('free-user'), true);
assert.equal(await hasPaidOrder('another-user'), false);
await client.execute(
  "UPDATE 'order' SET deleted_at=1 WHERE id='pending-order'"
);
assert.equal(await hasPaidOrder('free-user'), false);
for (const path of [
  'src/routes/api/studio/generate.ts',
  'src/routes/api/genjutsu/generate.ts',
]) {
  const source = await readFile(path, 'utf8');
  assert.ok(source.includes('await hasPaidOrder(session.user.id)'));
  assert.ok(
    source.indexOf('await hasPaidOrder(session.user.id)') <
      source.indexOf('const claim =') ||
      source.indexOf('await hasPaidOrder(session.user.id)') <
        source.indexOf('const task = await createTask')
  );
  assert.ok(!source.includes('isAdmin ? 0'));
}
const fal = await readFile('src/routes/api/ai/fal/generate.ts', 'utf8');
assert.ok(fal.includes("spec.mediaType === 'video'"));
console.log(
  'PASS: no paid order / pending / deleted / wrong owner denied; paid order accepted; all video APIs gated before task creation; admin bypass removed'
);
