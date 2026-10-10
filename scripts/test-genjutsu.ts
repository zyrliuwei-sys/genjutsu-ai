// Offline regression checks: no credentials, database writes or paid requests.
import assert from 'node:assert/strict';

import {
  buildGenjutsuPrompt,
  GENJUTSU_ASPECTS,
  GENJUTSU_ENDPOINT,
  GENJUTSU_EVOLINK_MODEL,
  genjutsuReadiness,
  isGenjutsuAspect,
} from '../src/config/genjutsu';
import { PRACTICE_SAMPLES } from '../src/config/practice-media';
import { EvolinkProvider } from '../src/core/ai/evolink';
import { FalProvider } from '../src/core/ai/fal';
import { AIMediaType, AITaskStatus } from '../src/core/ai/types';
import { hasFreshVideoReceipt } from '../src/lib/genjutsu-media';

const storage = {
  r2_access_key: 'test',
  r2_secret_key: 'test',
  r2_bucket_name: 'test',
  r2_account_id: 'test',
  r2_domain: 'https://media.example.test',
  waffo_prompt_safety_enabled: 'false',
};
const mediaUrl = 'https://media.example.test/video.mp4';
const receipt = {
  payload: JSON.stringify({ url: mediaUrl, expires: 120_000 }),
  signature: 'a'.repeat(64),
};
assert.equal(hasFreshVideoReceipt(receipt, mediaUrl, 0), true);
assert.equal(hasFreshVideoReceipt(receipt, mediaUrl, 100_000), false);
assert.equal(hasFreshVideoReceipt(receipt, `${mediaUrl}?other`, 0), false);
assert.equal(hasFreshVideoReceipt(undefined, mediaUrl, 0), false);
assert.equal(
  hasFreshVideoReceipt({ ...receipt, payload: 'invalid' }, mediaUrl, 0),
  false
);
assert.doesNotMatch(PRACTICE_SAMPLES[1].direction, /gray casual shirt/);
assert.deepEqual(GENJUTSU_ASPECTS, ['16:9', '9:16']);
assert.equal(isGenjutsuAspect('4:3'), false);
assert.equal(isGenjutsuAspect('16:9'), true);
assert.equal(isGenjutsuAspect('9:16'), true);
assert.deepEqual(
  genjutsuReadiness({ ...storage, fal_api_key: 'test' }).aspects,
  ['16:9', '9:16']
);
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
const kept = buildGenjutsuPrompt('ignored old effect', false, 'fal', {
  mode: 'keep',
  description: 'ignored scene',
});
assert.match(kept, /Preserve the original background/);
assert.doesNotMatch(kept, /ignored old effect|ignored scene/);
const guided = buildGenjutsuPrompt(
  '',
  false,
  'evolink',
  {
    mode: 'keep',
    description: '',
  },
  'Preserve the source arm wave'
);
assert.match(guided, /Preserve the source arm wave/);
assert.match(guided, /Preserve the original background/);
for (const sample of PRACTICE_SAMPLES) {
  for (const provider of ['fal', 'evolink'] as const) {
    const samplePrompt = buildGenjutsuPrompt(
      '',
      false,
      provider,
      {
        mode: 'keep',
        description: '',
      },
      sample.direction
    );
    assert.ok(samplePrompt.includes(sample.direction));
    assert.match(samplePrompt, /Preserve the original background/);
    assert.doesNotMatch(samplePrompt, /Replace the background environment/);
    const newScene = buildGenjutsuPrompt(
      '',
      false,
      provider,
      {
        mode: 'change',
        description: 'a sunset rooftop',
      },
      sample.direction
    );
    assert.ok(newScene.includes(sample.direction));
    assert.match(
      newScene,
      /Replace the background environment with: a sunset rooftop/
    );
  }
}
const changed = buildGenjutsuPrompt('', false, 'evolink', {
  mode: 'change',
  description: 'rooftop at sunset',
});
assert.match(
  changed,
  /Replace the background environment with: rooftop at sunset/
);
assert.match(changed, /Preserve the main action/);
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
        elements: [
          {
            frontal_image_url: 'https://media.example.test/image.jpg',
            reference_image_urls: ['https://media.example.test/image.jpg'],
          },
        ],
        image_urls: [],
        keep_audio: true,
      },
    },
  });
  assert.equal(calls.at(-1)?.url, `https://queue.fal.run/${GENJUTSU_ENDPOINT}`);
  assert.deepEqual(calls.at(-1)?.body.elements, [
    {
      frontal_image_url: 'https://media.example.test/image.jpg',
      reference_image_urls: ['https://media.example.test/image.jpg'],
    },
  ]);
  assert.equal(calls.at(-1)?.body.video_url, mediaUrl);
  assert.equal(calls.at(-1)?.body.keep_audio, true);
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
  assert.deepEqual(calls.at(-1)?.body.video_urls, [mediaUrl]);
  assert.deepEqual(calls.at(-1)?.body.image_urls, [
    'https://media.example.test/image.jpg',
  ]);
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
