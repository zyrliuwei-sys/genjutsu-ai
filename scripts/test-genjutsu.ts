// Offline regression checks: no credentials, database writes or paid requests.
import assert from 'node:assert/strict';

import {
  buildGenjutsuPrompt,
  GENJUTSU_ENDPOINT,
  GENJUTSU_EVOLINK_MODEL,
  genjutsuReadiness,
} from '../src/config/genjutsu';
import { EvolinkProvider } from '../src/core/ai/evolink';
import { FalProvider } from '../src/core/ai/fal';
import { AIMediaType, AITaskStatus } from '../src/core/ai/types';

const storage = {
  r2_access_key: 'test',
  r2_secret_key: 'test',
  r2_bucket_name: 'test',
  r2_account_id: 'test',
  r2_domain: 'https://media.example.test',
  waffo_prompt_safety_enabled: 'false',
};
assert.equal(genjutsuReadiness({}).ready, false);
assert.equal(
  genjutsuReadiness({ evolink_api_key: 'test' }).storageReady,
  false
);
const ready = genjutsuReadiness({ ...storage, evolink_api_key: 'test' });
assert.equal(ready.ready, true);
assert.equal(
  genjutsuReadiness({
    ...storage,
    waffo_prompt_safety_enabled: 'true',
    evolink_api_key: 'test',
  }).ready,
  false
);
assert.equal(ready.provider, 'evolink');
assert.deepEqual(ready.aspects, ['16:9', '9:16']);
assert.equal(ready.maxVideoMB, 100);
assert.equal(
  genjutsuReadiness({ ...storage, fal_api_key: 'test' }).provider,
  'fal'
);
assert.match(buildGenjutsuPrompt('', false, 'fal'), /@Element1/);
assert.doesNotMatch(
  buildGenjutsuPrompt('', false, 'evolink'),
  /@Element1|@Video1/
);
assert.match(buildGenjutsuPrompt('', true, 'evolink'), /reference image 2/);
assert.ok(buildGenjutsuPrompt('x'.repeat(5000), false, 'fal').length < 2000);

const realFetch = globalThis.fetch;
const calls: { url: string; body?: any }[] = [];
let responses: any[] = [];
globalThis.fetch = async (url, init) => {
  calls.push({
    url: String(url),
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  });
  const response = responses.shift();
  assert.ok(response, 'Unexpected network request');
  return Response.json(response.body, { status: response.status || 200 });
};
try {
  const fal = new FalProvider({ apiKey: 'offline-test' });
  responses = [{ body: { request_id: 'test-fal-id' } }];
  await fal.generate({
    params: {
      mediaType: AIMediaType.VIDEO,
      model: GENJUTSU_ENDPOINT,
      prompt: 'edit',
      options: {
        video_url: 'https://media.example.test/video.mp4',
        image_input: ['https://media.example.test/image.jpg'],
      },
    },
  });
  assert.equal(calls.at(-1)?.url, `https://queue.fal.run/${GENJUTSU_ENDPOINT}`);
  assert.deepEqual(calls.at(-1)?.body.image_urls, [
    'https://media.example.test/image.jpg',
  ]);
  assert.equal(calls.at(-1)?.body.input_images, undefined);
  responses = [{ body: { status: 'IN_PROGRESS' } }];
  const running = await fal.query({
    taskId: 'test-fal-id',
    model: GENJUTSU_ENDPOINT,
    mediaType: AIMediaType.VIDEO,
  });
  assert.equal(running.taskStatus, AITaskStatus.PROCESSING);
  assert.equal(
    calls.at(-1)?.url,
    'https://queue.fal.run/fal-ai/kling-video/requests/test-fal-id/status'
  );
  responses = [
    { body: { status: 'COMPLETED' } },
    { body: { video: { url: 'https://media.example.test/result.mp4' } } },
  ];
  const result = await fal.query({
    taskId: 'test-fal-id',
    model: GENJUTSU_ENDPOINT,
    mediaType: AIMediaType.VIDEO,
  });
  assert.equal(result.taskStatus, AITaskStatus.SUCCESS);
  assert.equal(
    (result.taskResult as any).video.url,
    'https://media.example.test/result.mp4'
  );
  assert.equal(
    calls.at(-1)?.url,
    'https://queue.fal.run/fal-ai/kling-video/requests/test-fal-id'
  );
  responses = [
    { body: { status: 'COMPLETED', error: 'Invalid source video' } },
  ];
  assert.equal(
    (await fal.query({ taskId: 'test-fal-id', model: GENJUTSU_ENDPOINT }))
      .taskStatus,
    AITaskStatus.FAILED
  );
  responses = [{ body: { status: 'COMPLETED' } }, { status: 422, body: {} }];
  assert.equal(
    (await fal.query({ taskId: 'test-fal-id', model: GENJUTSU_ENDPOINT }))
      .taskStatus,
    AITaskStatus.FAILED
  );
  responses = [{ status: 503, body: {} }];
  await assert.rejects(
    () => fal.query({ taskId: 'test-fal-id', model: GENJUTSU_ENDPOINT }),
    /503/
  );

  const evo = new EvolinkProvider({ apiKey: 'offline-test' });
  responses = [{ body: { id: 'test-evo-id' } }];
  const id = await evo.createVideo({
    model: GENJUTSU_EVOLINK_MODEL,
    prompt: 'edit',
    video_urls: ['https://media.example.test/video.mp4'],
    image_urls: ['https://media.example.test/image.jpg'],
    aspect_ratio: '9:16',
    keep_original_sound: true,
  });
  assert.equal(id, 'test-evo-id');
  assert.equal(calls.at(-1)?.body.model, 'kling-o1-video-edit');
  assert.equal(calls.at(-1)?.body.aspect_ratio, '9:16');
  responses = [
    {
      body: {
        id,
        status: 'completed',
        results: ['https://media.example.test/result.mp4'],
        progress: 100,
      },
    },
  ];
  assert.equal(
    (await evo.getTask(id)).url,
    'https://media.example.test/result.mp4'
  );
  responses = [
    { body: { id, status: 'failed', error: { message: 'Invalid input' } } },
  ];
  assert.equal((await evo.getTask(id)).error, 'Invalid input');
  console.log(
    'PASS: readiness, prompt references, fal submission/polling/errors, EvoLink edit request/results (offline).'
  );
} finally {
  globalThis.fetch = realFetch;
}
