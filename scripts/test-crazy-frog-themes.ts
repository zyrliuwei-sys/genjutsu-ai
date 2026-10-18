import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildGenjutsuPrompt,
  CRAZY_FROG_THEMES,
  GENJUTSU_REFERENCES,
  genjutsuCredits,
} from '../src/config/genjutsu';
import { referenceVideoPlan } from '../src/lib/reference-video-plan';
import { mp4Dimensions } from '../src/lib/video-dimensions';
import { mp4Duration } from '../src/lib/video-duration';
import { MAX_REFERENCE_VIDEO_BYTES } from '../src/lib/video-trim-plan';

assert.equal(CRAZY_FROG_THEMES.length, 6);
assert.equal(new Set(CRAZY_FROG_THEMES.map((t) => t.slug)).size, 6);
for (const theme of CRAZY_FROG_THEMES) {
  const bytes = new Uint8Array(
    await readFile(
      new URL(
        `../public/videos/crazy-frog/references/${theme.slug}.mp4`,
        import.meta.url
      )
    )
  );
  const duration = mp4Duration(bytes);
  const { width, height } = mp4Dimensions(bytes);
  assert.ok(bytes.length < MAX_REFERENCE_VIDEO_BYTES, theme.slug);
  assert.ok(duration >= 3 && duration <= 10.05, `${theme.slug}: ${duration}s`);
  assert.equal(genjutsuCredits(duration), 990);
  assert.deepEqual([width, height], [1280, 720]);
  assert.equal(referenceVideoPlan(width, height, '16:9').needsResize, false);
  const reference = GENJUTSU_REFERENCES[`crazy-frog-${theme.slug}`];
  assert.equal(reference.name, theme.name);
  for (const provider of ['evolink', 'fal'] as const) {
    const prompt = buildGenjutsuPrompt(reference.direction, false, provider);
    assert.match(prompt, /invisible motorcycle/);
    assert.match(prompt, /main crouching rider/);
    assert.match(prompt, /Keep the pursuer/);
    assert.ok(prompt.length < 2000);
  }
  console.log(`${theme.slug}: ${duration}s, ${width}×${height}, input ready`);
}
