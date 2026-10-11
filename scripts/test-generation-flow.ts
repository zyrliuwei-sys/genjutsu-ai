import assert from 'node:assert/strict';

import { envConfigs } from '../src/config/index';

// No .env loading, no remote database, no provider calls.
envConfigs.database_provider = 'sqlite';
envConfigs.database_url = 'file::memory:';
envConfigs.database_auth_token = '';
const { db } = await import('../src/core/db/index');
const database = db();
const client = database.$client;
await client.executeMultiple(`
CREATE TABLE ai_task (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, media_type TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, prompt TEXT NOT NULL, options TEXT, status TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0, deleted_at INTEGER, task_id TEXT, task_info TEXT, task_result TEXT, cost_credits INTEGER NOT NULL DEFAULT 0, scene TEXT NOT NULL DEFAULT '', credit_id TEXT);
CREATE TABLE credit (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_email TEXT, order_no TEXT, subscription_no TEXT, transaction_no TEXT NOT NULL UNIQUE, transaction_type TEXT NOT NULL, transaction_scene TEXT, credits INTEGER NOT NULL, remaining_credits INTEGER NOT NULL DEFAULT 0, description TEXT, expires_at INTEGER, status TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0, deleted_at INTEGER, consumed_detail TEXT, metadata TEXT);
`);
let failNextBatch = false;
let changeGrantBeforeBatch = false;
(globalThis as any).__CF_ENV__ = {
  DB: {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return { sql, args };
        },
      };
    },
    async batch(statements: any[]) {
      if (failNextBatch) {
        failNextBatch = false;
        throw new Error('simulated database outage');
      }
      if (changeGrantBeforeBatch) {
        changeGrantBeforeBatch = false;
        await client.execute(
          "UPDATE credit SET remaining_credits = 900 WHERE id = 'grant-race'"
        );
      }
      return client.batch(statements, 'write');
    },
  },
};
envConfigs.database_provider = 'd1';
const {
  createTaskOnce,
  updateTask,
  retryFailedRefund,
  findTask,
  AITaskStatus,
} = await import('../src/modules/ai-tasks/service');
const { getBalance } = await import('../src/modules/credits/service');
const { generationTaskId, validGenerationRequestId } =
  await import('../src/lib/generation-request');
const { getDownload } = await import('../src/modules/media-download/service');

async function grant(userId: string, id: string) {
  await client.execute({
    sql: "INSERT INTO credit (id,user_id,transaction_no,transaction_type,credits,remaining_credits,status) VALUES (?, ?, ?, 'grant', 2000, 2000, 'active')",
    args: [id, userId, id],
  });
}
const requestId = crypto.randomUUID();
assert(validGenerationRequestId(requestId));
assert(!validGenerationRequestId('../bad'));
assert.notEqual(
  await generationTaskId('a', requestId),
  await generationTaskId('b', requestId)
);
await grant('user', 'grant');
const params = {
  id: await generationTaskId('user', requestId),
  userId: 'user',
  mediaType: 'video',
  provider: 'evolink',
  model: 'genjutsu',
  prompt: 'test',
  costCredits: 620,
};
const first = await createTaskOnce(params);
const retry = await createTaskOnce(params);
assert.equal(first.created, true);
assert.equal(retry.created, false);
assert.equal(first.task.id, retry.task.id);
assert.equal(await getBalance('user'), 1380);
const consumed = await client.execute(
  "SELECT COUNT(*) AS n FROM credit WHERE transaction_type = 'consume'"
);
assert.equal(consumed.rows[0].n, 1);
const concurrentId = await generationTaskId('concurrent', crypto.randomUUID());
await grant('concurrent', 'grant-concurrent');
const concurrent = await Promise.all([
  createTaskOnce({ ...params, userId: 'concurrent', id: concurrentId }),
  createTaskOnce({ ...params, userId: 'concurrent', id: concurrentId }),
]);
assert.equal(concurrent.filter((c) => c.created).length, 1);
assert.equal(await getBalance('concurrent'), 1380);

failNextBatch = true;
await assert.rejects(
  updateTask({ taskId: params.id, status: AITaskStatus.FAILED }),
  /simulated database outage/
);
assert.equal((await findTask(params.id)).status, AITaskStatus.FAILED);
assert.equal(await getBalance('user'), 1380);
await retryFailedRefund(params.id);
await retryFailedRefund(params.id);
assert.equal(await getBalance('user'), 2000);
await updateTask({ taskId: params.id, status: AITaskStatus.PROCESSING });
assert.equal((await findTask(params.id)).status, AITaskStatus.FAILED);

await grant('race', 'grant-race');
changeGrantBeforeBatch = true;
const raceId = await generationTaskId('race', crypto.randomUUID());
await assert.rejects(createTaskOnce({ ...params, id: raceId, userId: 'race' }));
assert.equal(await findTask(raceId), undefined);
assert.equal(await getBalance('race'), 900);
const raceConsume = await client.execute(
  "SELECT COUNT(*) AS n FROM credit WHERE user_id = 'race' AND transaction_type = 'consume'"
);
assert.equal(raceConsume.rows[0].n, 0);

const free = await createTaskOnce({ ...params, id: 'success', costCredits: 0 });
await updateTask({
  taskId: free.task.id,
  status: AITaskStatus.SUCCESS,
  taskResult: { video: { url: 'https://media.example.com/studio/test.mp4' } },
});
await updateTask({ taskId: free.task.id, status: AITaskStatus.FAILED });
assert.equal((await findTask(free.task.id)).status, AITaskStatus.SUCCESS);
await assert.rejects(
  getDownload('other-user', 'success', 'https://media.example.com'),
  /Download unavailable/
);
await assert.rejects(
  getDownload('user', 'success', 'https://wrong.example.com'),
  /Download unavailable/
);
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(new Uint8Array([1, 2, 3]));
const file = await getDownload('user', 'success', 'https://media.example.com');
assert.equal(file.filename, 'genjutsu-success.mp4');
assert.equal(file.type, 'video/mp4');
assert.equal((await new Response(file.body).arrayBuffer()).byteLength, 3);
globalThis.fetch = originalFetch;

const { GENJUTSU_MODEL_ID } = await import('../src/config/genjutsu');
const { refreshTask } = await import('../src/routes/api/studio/-shared');
const stuck = await createTaskOnce({
  ...params,
  id: 'stuck',
  costCredits: 0,
  model: GENJUTSU_MODEL_ID,
});
await client.execute(
  "UPDATE ai_task SET task_id = 'provider-stuck', created_at = 1 WHERE id = 'stuck'"
);
let archiveAttempts = 0;
Object.assign(envConfigs, {
  r2_access_key: 'fake',
  r2_secret_key: 'fake',
  r2_bucket_name: 'fake',
  r2_account_id: 'fake',
  r2_domain: 'https://media.example.com',
});
globalThis.fetch = async (input) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (url.includes('/v1/tasks/'))
    return Response.json({
      id: 'fake',
      status: url.endsWith('provider-stuck') ? 'processing' : 'completed',
      results: ['https://provider.example.com/result.mp4'],
    });
  if (url.startsWith('https://provider.example.com/'))
    return new Response(new Uint8Array([1, 2, 3]));
  if (url.includes('r2.cloudflarestorage.com')) {
    archiveAttempts++;
    return new Response(null, { status: archiveAttempts === 1 ? 400 : 200 });
  }
  throw new Error('Unexpected test network request');
};
assert.equal(
  (
    await refreshTask(await findTask(stuck.task.id), {
      evolink_api_key: 'fake',
    })
  ).status,
  'failed'
);
const archiveTask = await createTaskOnce({
  ...params,
  id: 'archive',
  costCredits: 0,
  model: GENJUTSU_MODEL_ID,
});
await client.execute({
  sql: "UPDATE ai_task SET task_id = 'provider-archive', created_at = ? WHERE id = 'archive'",
  args: [Date.now()],
});
const pendingArchive = await refreshTask(await findTask(archiveTask.task.id), {
  evolink_api_key: 'fake',
});
assert.equal(pendingArchive.status, 'success');
assert.equal(pendingArchive.archivePending, true);
await assert.rejects(
  getDownload('user', 'archive', envConfigs.r2_domain),
  /still being saved/
);
const saved = await refreshTask(await findTask('archive'), {
  evolink_api_key: 'fake',
});
assert.equal(saved.archivePending, false);
assert(saved.url?.startsWith('https://media.example.com/'));
globalThis.fetch = originalFetch;
const { runD1HttpAtomicBatch } = await import('../src/core/db/d1-http');
process.env.CLOUDFLARE_ACCOUNT_ID = 'fake-account';
process.env.D1_DATABASE_ID = 'fake-database';
process.env.CLOUDFLARE_API_TOKEN = 'fake-test-token';
let httpRequests = 0;
globalThis.fetch = async (input, init) => {
  assert.equal(
    input,
    'https://api.cloudflare.com/client/v4/accounts/fake-account/d1/database/fake-database/query'
  );
  httpRequests++;
  assert.equal(JSON.parse(init?.body as string).batch.length, 2);
  return Response.json({
    success: true,
    result: [{ success: true }, { success: true }],
  });
};
await runD1HttpAtomicBatch([
  { sql: 'SELECT ?', params: [1] },
  { sql: 'SELECT ?', params: [2] },
]);
assert.equal(httpRequests, 1);
globalThis.fetch = originalFetch;
client.close();
console.log(
  'PASS: concurrent/durable dedupe, atomic D1 batch rollback, retryable/idempotent refunds, terminal-state guards, processing timeout, archive retry, owner-only download'
);
