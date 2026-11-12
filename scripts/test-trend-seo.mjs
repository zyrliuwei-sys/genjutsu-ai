import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const origin = process.env.SEO_TEST_ORIGIN || 'http://127.0.0.1:3003';
const slugs = [
  'hit-the-road-dude-ai',
  'dime-dime-baby-ai',
  'ozil-ai',
  'flying-car-ai',
  'crazy-frog-ai',
  'bulin-47-ai',
  'pollo-ai-kissing',
  'burning-bridges-ai',
  'dame-hombro-ai',
  'tiny-desk-ai',
];
const locales = ['', '/de', '/fr', '/es', '/pt-br'];
const decode = (s) => s.replaceAll('&amp;', '&').replaceAll('&#x27;', "'");
const markup = (s) => s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
const anchors = (s) =>
  [...s.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({
    href: decode(m[1]),
    text: m[2].replace(/<[^>]+>/g, ''),
  }));
const section = (html, id) =>
  html.match(
    new RegExp(`<section\\b[^>]*id="${id}"[^>]*>([\\s\\S]*?)</section>`)
  )?.[1] || '';
async function get(path, status = 200) {
  const { stdout } = await exec(
    'curl',
    ['-sS', '--max-time', '30', '-w', '\n%{http_code}', `${origin}${path}`],
    { maxBuffer: 8 * 1024 * 1024 }
  );
  const boundary = stdout.lastIndexOf('\n');
  assert.equal(Number(stdout.slice(boundary + 1)), status, path);
  return markup(stdout.slice(0, boundary));
}
function assertDestinations(html, paths) {
  const links = anchors(html);
  for (const path of paths) {
    const link = links.find((a) => a.href === path);
    assert.ok(link, `Missing SSR anchor: ${path}`);
    assert.ok(link.text.trim().length > 3, `Empty/generic anchor: ${path}`);
    assert.ok(!/^(learn more|view)$/i.test(link.text.trim()), path);
  }
}

const home = await get('/');
assert.equal(
  decode(home.match(/<title>(.*?)<\/title>/s)?.[1] || ''),
  'Genjutsu AI - AI Video Generator'
);
assert.equal(
  home
    .match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1]
    .replace(/<[^>]+>/g, '')
    .replace(/<!--.*?-->/g, ''),
  'Put yourself in any viral video with Genjutsu AI'
);
assertDestinations(
  section(home, 'trending-ai-video-effects'),
  slugs.map((s) => `/${s}`)
);
console.log(
  `PASS curl homepage: ${slugs.length} static trend cards; protected title and H1 preserved`
);

for (const prefix of locales) {
  const effects = await get(`${prefix}/genjutsu-video-ai`);
  const headings = [...effects.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)];
  const links = headings.flatMap((h) => anchors(h[1]));
  assert.equal(links.length, 10, `${prefix}: effect-title links`);
  assert.ok(links.every((a) => a.href === `${prefix}/create#genjutsu-effects`));
  assertDestinations(
    section(effects, 'trending-ai-video-effects'),
    slugs.map((s) => `${prefix}/${s}`)
  );
}
console.log(
  `PASS curl effects pages: ten linked effect headings plus ${slugs.length} trend destinations per locale`
);

const sitemap = await get('/sitemap.xml');
const locations = new Set(
  [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
);
const incoming = Object.fromEntries(slugs.map((s) => [s, 0]));
for (const prefix of locales) {
  for (const slug of slugs) {
    const path = `${prefix}/${slug}`;
    const html = await get(path);
    const canonical = html.match(
      /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/
    )?.[1];
    assert.ok(
      canonical && locations.has(canonical),
      `Canonical missing from sitemap: ${path}`
    );
    assert.equal(new URL(canonical).pathname, path);
    const alternates = [
      ...html.matchAll(
        /<link\b[^>]*rel="alternate"[^>]*hrefLang="([^"]+)"[^>]*href="([^"]+)"/g
      ),
    ];
    assert.deepEqual(
      alternates.map((a) => a[1]).sort(),
      ['de', 'en', 'es', 'fr', 'pt-BR', 'x-default'].sort()
    );
    for (const a of alternates) {
      const expectedPrefix =
        a[1] === 'en' || a[1] === 'x-default' ? '' : `/${a[1].toLowerCase()}`;
      assert.equal(new URL(a[2]).pathname, `${expectedPrefix}/${slug}`);
    }
    const related = anchors(section(html, 'related-trends'));
    assert.ok(related.length >= 4 && related.length <= 6, path);
    assert.equal(related[0].href, '/genjutsu-trends');
    assert.equal(
      related[0].text,
      'All trending AI video memesExplore all 10 trends, photo tips and templates.'
    );
    assert.equal(new Set(related.map((a) => a.href)).size, related.length);
    assert.ok(
      related
        .slice(1)
        .every(
          (a) =>
            a.href !== path && slugs.some((s) => a.href === `${prefix}/${s}`)
        ),
      path
    );
    if (!prefix) for (const a of related.slice(1)) incoming[a.href.slice(1)]++;
  }
}
assert.ok(Object.values(incoming).every((count) => count >= 3));
console.log(
  `PASS curl ${slugs.length * locales.length} trend URLs: direct 200, matching sitemap/canonical/hreflang, related links and incoming coverage`
);

for (const path of ['/dime-dime-baby-ai/', '/fr/crazy-frog-ai/']) {
  await get(path, 301);
  const { stdout } = await exec('curl', [
    '-sS',
    '--max-time',
    '30',
    '-D',
    '-',
    '-o',
    '/dev/null',
    `${origin}${path}`,
  ]);
  const location = stdout.match(/^location:\s*(.*)$/im)?.[1].trim();
  assert.equal(new URL(location, origin).pathname, path.slice(0, -1));
}
assert.ok((await get('/robots.txt')).includes('Disallow: /*?*'));
console.log('PASS canonical redirects and protected query-string robots rule');

for (const [slug, title, h1] of [
  [
    'ai-genjutsu-generator',
    'Genjutsu AI Generator Guide: Inputs, Limits & Workflow',
    'Genjutsu AI generator: inputs and limits',
  ],
  [
    'higgsfield-genjutsu-alternative',
    'Higgsfield Genjutsu Alternative: Workflows & Costs',
    'Higgsfield Genjutsu alternative: workflows and costs',
  ],
]) {
  const html = await get(`/${slug}`);
  assert.equal(decode(html.match(/<title>(.*?)<\/title>/s)?.[1] || ''), title);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.equal(html.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1], h1);
  assert.ok(html.includes('name="description" content="'));
}
console.log('PASS GSC-informed guide and comparison metadata');
