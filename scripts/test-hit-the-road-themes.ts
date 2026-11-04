import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  buildGenjutsuPrompt,
  GENJUTSU_REFERENCES,
  genjutsuCredits,
  HIT_THE_ROAD_THEMES,
} from '../src/config/genjutsu';
import { referenceVideoPlan } from '../src/lib/reference-video-plan';
import { mp4Dimensions } from '../src/lib/video-dimensions';
import { mp4Duration } from '../src/lib/video-duration';
import { MAX_REFERENCE_VIDEO_BYTES } from '../src/lib/video-trim-plan';

for (const theme of HIT_THE_ROAD_THEMES) {
  const path = new URL(
    `../public/videos/hit-the-road-dude/references/${theme.slug}.mp4`,
    import.meta.url
  );
  const bytes = new Uint8Array(await readFile(path));
  const duration = mp4Duration(bytes);
  const { width, height } = mp4Dimensions(bytes);
  assert.ok(Math.abs(duration - 10) < 0.05, `${theme.slug}: ${duration}s`);
  assert.ok(bytes.length < MAX_REFERENCE_VIDEO_BYTES);
  assert.equal(genjutsuCredits(duration), 990);
  assert.deepEqual(
    [width, height],
    theme.ratio === '9:16' ? [720, 1280] : [1280, 720]
  );
  assert.equal(
    referenceVideoPlan(width, height, theme.ratio).needsResize,
    false
  );
  const streams = JSON.parse(
    execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_streams', '-of', 'json', fileURLToPath(path)],
      { encoding: 'utf8' }
    )
  ).streams;
  assert.ok(
    streams.some(
      (s: { codec_type: string; codec_name: string }) =>
        s.codec_type === 'audio' && s.codec_name === 'aac'
    )
  );
  const context = GENJUTSU_REFERENCES[`road-${theme.slug}`];
  assert.equal(context.subject, 'character');
  for (const provider of ['evolink', 'fal'] as const) {
    const prompt = buildGenjutsuPrompt(
      context.direction,
      false,
      provider,
      context.subject
    );
    assert.match(prompt, /identity and species/);
    assert.match(prompt, /natural paws/);
    assert.match(prompt, /white truck/);
    assert.match(prompt, /seated inside the cab/);
    assert.ok(prompt.length < 2000);
  }
  console.log(
    `PASS ${theme.slug}: 10s, ${width}×${height}, AAC audio, valid template prompt`
  );
}
// The pet-capable instruction is scoped to this trend; other scenes keep their existing subjects.
assert.match(
  buildGenjutsuPrompt('', false, 'evolink'),
  /skin tone of the person/
);
assert.equal(GENJUTSU_REFERENCES['flying-car-ai'].subject, 'vehicle');
assert.equal(GENJUTSU_REFERENCES['pollo-ai-kissing'].subject, 'couple');
