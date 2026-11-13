// Offline media/prompt checks. Set SEO_TEST_ORIGIN to check a running build.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  buildGenjutsuPrompt,
  GENJUTSU_REFERENCES,
  genjutsuCredits,
  SHERU_THEMES,
} from '../src/config/genjutsu';
import { RELATED_TRENDS, TREND_PAGES } from '../src/config/trends';
import { sheruFaq, sheruMeta } from '../src/content/sheru';
import { referenceVideoPlan } from '../src/lib/reference-video-plan';
import { mp4Dimensions } from '../src/lib/video-dimensions';
import { mp4Duration } from '../src/lib/video-duration';
import { MAX_REFERENCE_VIDEO_BYTES } from '../src/lib/video-trim-plan';

for (const theme of SHERU_THEMES) {
  const path = new URL(
    `../public/videos/sheru/references/${theme.slug}.mp4`,
    import.meta.url
  );
  const bytes = new Uint8Array(await readFile(path));
  const { width, height } = mp4Dimensions(bytes);
  const seconds = mp4Duration(bytes);
  assert.deepEqual([width, height], [720, 1280]);
  assert.ok(Math.abs(seconds - theme.seconds) < 0.05);
  assert.ok(bytes.length < MAX_REFERENCE_VIDEO_BYTES);
  assert.equal(genjutsuCredits(seconds), 990);
  assert.equal(referenceVideoPlan(width, height, '9:16').needsResize, false);
  const streams = JSON.parse(
    execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_streams', '-of', 'json', fileURLToPath(path)],
      { encoding: 'utf8' }
    )
  ).streams;
  assert.equal(
    streams.length,
    1,
    'The palace reference is advertised as silent'
  );
  assert.equal(streams[0].codec_name, 'h264');
  assert.equal(streams[0].pix_fmt, 'yuv420p');
}
for (const id of ['sheru-palace', 'sheru-bhai-ai']) {
  const reference = GENJUTSU_REFERENCES[id];
  assert.equal(reference.subject, 'lion');
  assert.ok(
    reference.direction.length <= 500,
    'Do not silently truncate the scene instructions'
  );
  for (const provider of ['fal', 'evolink'] as const) {
    const prompt = buildGenjutsuPrompt(
      reference.direction,
      false,
      provider,
      reference.subject
    );
    assert.match(prompt, /lion head and full mane/);
    assert.match(prompt, /body proportions, outfit, colors and shoes/);
    assert.ok(
      prompt.includes(provider === 'fal' ? '@Element1' : 'reference image 1')
    );
    assert.doesNotMatch(
      prompt,
      /skin tone of the person|identity and species|original lean-in, kiss/
    );
    assert.ok(prompt.length < 2000);
    if (id === 'sheru-palace') assert.match(prompt, /palace columns/);
    else assert.doesNotMatch(prompt, /palace columns|brown jacket/);
  }
}
assert.equal(TREND_PAGES.at(-1)?.slug, 'sheru-bhai-ai');
assert.ok(
  Object.values(RELATED_TRENDS).filter((links) =>
    links.includes('sheru-bhai-ai')
  ).length >= 3
);
console.log(
  'PASS Sheru: usable 10-second silent reference, paid credit cost, lion/outfit prompts and related links'
);

if (process.env.SEO_TEST_ORIGIN) {
  const origin = process.env.SEO_TEST_ORIGIN;
  const get = async (path: string) => {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    return response.text();
  };
  const html = await get('/sheru-bhai-ai');
  const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  assert.ok(body.includes(`<title>${sheruMeta.title}</title>`));
  assert.equal((body.match(/<h1\b/g) || []).length, 1);
  assert.match(
    body,
    /rel="canonical" href="https:\/\/genjutsu-ai.org\/sheru-bhai-ai"/
  );
  assert.doesNotMatch(body, /hreflang=/i);
  for (const text of [
    'sheru-studio',
    'upload-lead',
    'upload-video',
    'Your full-body photo',
    'data-testid="generate-button"',
    '/videos/sheru/references/palace.mp4',
    'href="/guides/who-started-sheru-bhai-trend"',
  ]) {
    assert.ok(body.includes(text), text);
  }
  const graph = [
    ...html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
    ),
  ].flatMap((m) => JSON.parse(m[1])['@graph'] || []);
  assert.equal(
    graph.find((s) => s['@type'] === 'FAQPage').mainEntity.length,
    sheruFaq.length
  );
  assert.equal(
    graph.find((s) => s['@type'] === 'BreadcrumbList').itemListElement.length,
    3
  );
  for (const slug of RELATED_TRENDS['sheru-bhai-ai'])
    assert.ok(body.includes(`href="/${slug}"`));
  const home = await get('/');
  const grid =
    home.match(
      /<section id="trending-ai-video-effects"[\s\S]*?<\/section>/
    )?.[0] || '';
  const cards = [...grid.matchAll(/<a href="([^"]+)"/g)];
  assert.equal(cards.length, 12);
  assert.equal(cards.at(-1)?.[1], '/sheru-bhai-ai');
  assert.match(home, /<title>Genjutsu AI - AI Video Generator<\/title>/);
  assert.match(
    await get('/guides/who-started-sheru-bhai-trend'),
    /href="\/sheru-bhai-ai#sheru-studio"/
  );
  assert.match(await get('/genjutsu-trends'), /href="\/sheru-bhai-ai"/);
  const sitemap = await get('/sitemap.xml');
  const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].filter((m) =>
    m[1].includes('/sheru-bhai-ai')
  );
  assert.equal(entries.length, 1);
  assert.match(
    entries[0][1],
    /<loc>https:\/\/genjutsu-ai.org\/sheru-bhai-ai<\/loc>/
  );
  assert.doesNotMatch(entries[0][1], /hreflang/i);
  for (const path of [
    '/sheru-bhai-ai/',
    '/de/sheru-bhai-ai',
    '/fr/sheru-bhai-ai',
    '/es/sheru-bhai-ai',
    '/pt-br/sheru-bhai-ai',
  ]) {
    const response = await fetch(origin + path, { redirect: 'manual' });
    assert.equal(response.status, 301, path);
    assert.equal(
      new URL(response.headers.get('location')!, origin).pathname,
      '/sheru-bhai-ai'
    );
  }
  console.log(
    'PASS SSR: 12th homepage card, generator, guide links, FAQ/breadcrumbs, sitemap and canonical redirects'
  );
}
