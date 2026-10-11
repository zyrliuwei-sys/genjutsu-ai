import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const origin = process.env.SEO_TEST_ORIGIN || 'http://localhost:3002';
const canonicalOrigin = 'https://genjutsu-ai.org';
const pages = [
  [
    'ai-genjutsu-generator',
    'Genjutsu AI Generator — Text to Video in Minutes',
    'Genjutsu AI Generator',
    'Seedance 2.0 Fast',
  ],
  [
    'genjutsu-video-ai',
    'Genjutsu Video AI — AI Videos for Shorts & Ads',
    'Genjutsu Video AI',
    '10. Alors On Danse',
  ],
  [
    'genjutsu-free',
    'Is Genjutsu AI Free? Free Account vs Credit Cost',
    'Is Genjutsu AI Free?',
    '$6.90',
  ],
  [
    'higgsfield-genjutsu-alternative',
    'Higgsfield Genjutsu Alternative: Which Tool Fits Your Clip',
    'Higgsfield Genjutsu Alternative: Which Tool Fits Your Clip',
    '本站是独立工具，与 Higgsfield 无关联。',
  ],
];
const decode = (s) => s.replaceAll('&amp;', '&').replaceAll('&#x27;', "'");
const bodyOnly = (s) => s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
function check(html, slug, title, h1, phrase, locale = 'en') {
  const body = bodyOnly(html);
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.equal(decode(html.match(/<title>(.*?)<\/title>/s)?.[1] || ''), title);
  assert.equal((body.match(/<h1\b/g) || []).length, 1);
  assert.equal(body.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1], h1);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(
    html.includes(
      `rel="canonical" href="${canonicalOrigin}${locale === 'zh' ? '/zh' : ''}/${slug}"`
    )
  );
  assert.ok(html.includes('name="description" content="'));
  assert.ok(body.includes(phrase), `${slug}: body missing without JS`);
  assert.ok(body.includes('aria-label="Breadcrumb"'));
  for (const [other] of pages) {
    if (other !== slug)
      assert.ok(
        body.includes(`href="${locale === 'zh' ? '/zh' : ''}/${other}"`),
        `${slug}: missing link to ${other}`
      );
  }
  assert.ok(!/href="[^"]*genjutsu[^"\s]*\?/.test(body));
}
for (const [slug, title, h1, phrase] of pages) {
  check(
    await readFile(`.output/public/${slug}/index.html`, 'utf8'),
    slug,
    title,
    h1,
    phrase
  );
  const response = await fetch(`${origin}/${slug}`);
  assert.equal(response.status, 200);
  check(await response.text(), slug, title, h1, phrase);
  console.log(`PASS static HTML + raw HTTP: /${slug}`);
}
const home = bodyOnly(await (await fetch(origin)).text());
const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
for (const [slug] of pages) {
  assert.ok(
    home.includes(`href="/${slug}"`),
    `Homepage: ${slug} not one click away`
  );
  assert.ok(sitemap.includes(`<loc>${canonicalOrigin}/${slug}</loc>`));
  assert.ok(
    sitemap.includes(`hreflang="en" href="${canonicalOrigin}/${slug}"`)
  );
}
assert.ok(!home.includes('$9.90'));
assert.ok(home.includes('$6.90'));
assert.ok(
  !home.includes('/ai-livestream'),
  'Retired template still linked from homepage'
);
assert.equal((await fetch(`${origin}/ai-livestream`)).status, 404);
assert.ok(
  (await (await fetch(`${origin}/robots.txt`)).text()).includes(
    'Disallow: /*?*'
  )
);
console.log(
  'PASS homepage links, price consistency, sitemap hreflang, query-free URLs and robots'
);
