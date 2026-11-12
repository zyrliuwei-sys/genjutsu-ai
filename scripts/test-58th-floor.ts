import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildGenjutsuPrompt,
  FLOOR_THEMES,
  GENJUTSU_REFERENCES,
  genjutsuCredits,
  genjutsuEvolinkRequest,
} from '../src/config/genjutsu';
import { floorFaq, floorMeta } from '../src/content/58th-floor';
import { referenceVideoPlan } from '../src/lib/reference-video-plan';
import { mp4Dimensions } from '../src/lib/video-dimensions';
import { mp4Duration } from '../src/lib/video-duration';

for (const theme of FLOOR_THEMES) {
  const bytes = new Uint8Array(
    await readFile(
      new URL(
        `../public/videos/58th-floor/references/${theme.slug}.mp4`,
        import.meta.url
      )
    )
  );
  const { width, height } = mp4Dimensions(bytes);
  const seconds = mp4Duration(bytes);
  assert.deepEqual([width, height], [720, 1280]);
  assert.ok(Math.abs(seconds - theme.seconds) < 0.05);
  assert.equal(genjutsuCredits(seconds), 990);
  assert.equal(referenceVideoPlan(width, height, '9:16').needsResize, false);
  const reference = GENJUTSU_REFERENCES[`floor-${theme.slug}`];
  assert.equal(reference.subject, 'duo');
  assert.ok(
    reference.direction.length <= 500,
    'Provider direction must not be truncated'
  );
  for (const provider of ['fal', 'evolink'] as const) {
    const prompt = buildGenjutsuPrompt(
      reference.direction,
      true,
      provider,
      reference.subject
    );
    assert.ok(
      prompt.includes(`Photo 1 replaces the opening-left ${theme.left}`)
    );
    assert.ok(
      prompt.includes(`photo 2 replaces the opening-right ${theme.right}`)
    );
    assert.ok(
      prompt.includes(provider === 'fal' ? '@Element1' : 'reference image 1')
    );
    assert.ok(
      prompt.includes(provider === 'fal' ? '@Image1' : 'reference image 2')
    );
    assert.match(prompt, /teal studio/);
    assert.doesNotMatch(prompt, /Preserve the original lean-in, kiss/);
    assert.ok(prompt.length < 2000);
    assert.throws(
      () => buildGenjutsuPrompt(reference.direction, false, provider, 'duo'),
      /Two performer photos/
    );
  }
  console.log(
    `PASS ${theme.slug}: prepared 10s / 720×1280 video and independent two-person prompt`
  );
}
assert.match(
  buildGenjutsuPrompt('', true, 'evolink', 'couple'),
  /original lean-in, kiss/
);
assert.match(
  buildGenjutsuPrompt('', false, 'evolink'),
  /Replace only the main performer/
);
const request = genjutsuEvolinkRequest({
  prompt: 'duet',
  referenceVideo: 'https://media.example/reference.mp4',
  leadImage: 'https://media.example/left.jpg',
  crowdImage: 'https://media.example/right.jpg',
});
assert.deepEqual(request.image_urls, [
  'https://media.example/left.jpg',
  'https://media.example/right.jpg',
]);
assert.equal(request.keep_original_sound, true);

if (process.env.SEO_TEST_ORIGIN) {
  const origin = process.env.SEO_TEST_ORIGIN;
  const get = async (path: string) => {
    const result = await fetch(origin + path);
    assert.equal(result.status, 200, path);
    return result.text();
  };
  const html = await get('/58th-floor-ai');
  const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  assert.ok(body.includes(`<title>${floorMeta.title}</title>`));
  assert.equal((body.match(/<h1\b/g) || []).length, 1);
  assert.match(
    body,
    /rel="canonical" href="https:\/\/genjutsu-ai.org\/58th-floor-ai"/
  );
  assert.doesNotMatch(body, /hreflang=/i);
  assert.doesNotMatch(html, /\/(de|fr|es|pt-br)\/58th-floor-ai/);
  assert.match(html, /<html[^>]*lang="en"/);
  for (const value of [
    'floor-studio',
    'upload-lead',
    'upload-partner',
    'Photo 1 · Left',
    'Photo 2 · Right',
    'Make your 58th Floor video',
    'data-testid="generate-button"',
  ])
    assert.ok(body.includes(value), value);
  assert.ok((body.match(/href="\/genjutsu-trends"/g) || []).length >= 3);
  assert.ok(body.includes('href="/guides/58th-floor"'));
  for (const { q, a } of floorFaq) {
    assert.ok(body.includes(q));
    assert.ok(body.includes(a));
  }
  const graph = [
    ...html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
    ),
  ].flatMap((m) => JSON.parse(m[1])['@graph'] || []);
  assert.equal(
    graph.find((s) => s['@type'] === 'FAQPage').mainEntity.length,
    floorFaq.length
  );
  const home = await get('/');
  assert.match(
    home,
    /id="trending-ai-video-effects"[\s\S]*href="\/58th-floor-ai"/
  );
  assert.ok(
    (await get('/guides/58th-floor')).includes(
      'href="/58th-floor-ai#floor-studio"'
    )
  );
  const sitemap = await get('/sitemap.xml');
  const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].filter((m) =>
    m[1].includes('/58th-floor-ai')
  );
  assert.equal(entries.length, 1);
  assert.match(
    entries[0][1],
    /<loc>https:\/\/genjutsu-ai.org\/58th-floor-ai<\/loc>/
  );
  assert.doesNotMatch(entries[0][1], /hreflang/i);
  for (const prefix of ['', '/de', '/fr', '/es', '/pt-br']) {
    for (const slash of ['', '/']) {
      if (!prefix && !slash) continue;
      const response = await fetch(`${origin}${prefix}/58th-floor-ai${slash}`, {
        redirect: 'manual',
      });
      assert.equal(response.status, 301);
      assert.equal(
        new URL(response.headers.get('location')!, origin).pathname,
        '/58th-floor-ai'
      );
    }
  }
  console.log(
    'PASS SSR generator, two upload slots, metadata, guide/home links, English-only canonical and sitemap'
  );
}
