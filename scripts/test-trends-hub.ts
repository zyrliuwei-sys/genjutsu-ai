import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import { TREND_HUB_URL, TREND_PAGES } from '../src/config/trends';
import {
  trendSections,
  trendsFaq,
  trendsIntro,
  trendsMeta,
} from '../src/content/genjutsu-trends';

const origin = process.env.SEO_TEST_ORIGIN || 'http://localhost:3001';
const decode = (s: string) =>
  s
    .replaceAll('&amp;', '&')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<');
const markup = (s: string) =>
  s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
const text = (s: string) =>
  decode(
    markup(s)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
const count = (s: string) => s.trim().split(/\s+/).length;
const links = (s: string) =>
  [...s.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({
    href: decode(m[1]),
    label: text(m[2]),
  }));
async function get(path: string, headers?: Record<string, string>) {
  const response = await fetch(origin + path, { headers, redirect: 'manual' });
  assert.equal(response.status, 200, path);
  return await response.text();
}

const html = await get('/genjutsu-trends');
const body = markup(html);
assert.equal(
  decode(html.match(/<title>(.*?)<\/title>/s)![1]),
  trendsMeta.title
);
assert.equal((body.match(/<h1\b/g) || []).length, 1);
assert.equal(
  text(body.match(/<h1\b[^>]*>(.*?)<\/h1>/s)![1]),
  'Genjutsu AI Trends'
);
assert.equal(trendsMeta.description.length, 153);
assert.ok(body.includes(`content="${trendsMeta.description}"`));
assert.equal((body.match(/rel="canonical"/g) || []).length, 1);
assert.ok(body.includes(`rel="canonical" href="${TREND_HUB_URL}"`));
assert.ok(body.includes(`property="og:url" content="${TREND_HUB_URL}"`));
assert.ok(
  !/hreflang=/i.test(body),
  'English-only page must not emit alternate languages'
);
assert.ok(!/\/(de|fr|es|pt-br)\/genjutsu-trends/.test(html));
assert.ok(/<html\b[^>]*lang="en"/.test(html));

const allCopy = [
  ...trendsIntro,
  ...trendSections.flatMap((s) => [...s.paragraphs, s.tip]),
];
for (const paragraph of allCopy)
  assert.ok(
    decode(body).includes(paragraph),
    `Missing SSR paragraph: ${paragraph.slice(0, 70)}`
  );
assert.ok(
  count(trendsIntro.join(' ')) >= 120 && count(trendsIntro.join(' ')) <= 180
);
assert.ok(count(allCopy.join(' ')) > 2000);
const sectionCounts = trendSections.map((s, i) => {
  const words = count([...s.paragraphs, s.tip].join(' '));
  assert.ok(
    i < 4 ? words === 150 : words >= 200 && words <= 250,
    `${s.title}: ${words} words`
  );
  assert.ok(existsSync(`public${s.image}`), s.image);
  assert.ok(body.includes(`alt="${s.title} AI video reference scene"`));
  assert.ok(
    links(body).some(
      (a) => a.href === `${s.href}#${s.studio}` && a.label === 'Make my version'
    )
  );
  assert.ok(
    links(body).some(
      (a) => a.href === s.href && a.label.startsWith('View the full guide')
    )
  );
  return { title: s.title, words };
});
const headings = [...body.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) =>
  text(m[1])
);
assert.deepEqual(
  headings.slice(0, 10),
  trendSections.map((s) => s.title)
);
assert.ok(headings.some((h) => /genjutsu trends/i.test(h)));
const mainText = text(body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)![1]);
const primary = (mainText.match(/genjutsu trends/gi) || []).length;
const secondary = (mainText.match(/AI video trends/gi) || []).length;
assert.ok(primary >= 6 && primary <= 10, `genjutsu trends: ${primary}`);
assert.ok(secondary >= 3 && secondary <= 5, `AI video trends: ${secondary}`);

const schema = [
  ...html.matchAll(
    /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
  ),
].flatMap((m) => JSON.parse(m[1])['@graph'] || []);
assert.deepEqual(schema.map((s) => s['@type']).sort(), [
  'BreadcrumbList',
  'FAQPage',
  'WebPage',
]);
const breadcrumb = schema.find((s) => s['@type'] === 'BreadcrumbList');
assert.deepEqual(
  breadcrumb.itemListElement.map((s: any) => s.name),
  ['Home', 'Genjutsu AI Trends']
);
assert.equal(breadcrumb.itemListElement[1].item, TREND_HUB_URL);
assert.equal(schema.find((s) => s['@type'] === 'WebPage').url, TREND_HUB_URL);
assert.deepEqual(
  schema
    .find((s) => s['@type'] === 'FAQPage')
    .mainEntity.map((s: any) => ({ q: s.name, a: s.acceptedAnswer.text })),
  trendsFaq
);

const sitemap = await get('/sitemap.xml');
const hubEntries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].filter(
  (m) => m[1].includes('/genjutsu-trends')
);
assert.equal(hubEntries.length, 1);
assert.ok(hubEntries[0][1].includes(`<loc>${TREND_HUB_URL}</loc>`));
assert.ok(!/hreflang/i.test(hubEntries[0][1]));
for (const prefix of ['', '/de', '/fr', '/es', '/pt-br']) {
  for (const slash of ['', '/']) {
    if (!prefix && !slash) continue;
    const response = await fetch(`${origin}${prefix}/genjutsu-trends${slash}`, {
      redirect: 'manual',
    });
    assert.equal(response.status, 301);
    assert.equal(
      new URL(response.headers.get('location')!, origin).pathname,
      '/genjutsu-trends'
    );
  }
}
const cookiePage = await get('/genjutsu-trends', {
  cookie: 'PARAGLIDE_LOCALE=de',
});
assert.ok(/<html\b[^>]*lang="en"/.test(cookiePage));
assert.ok(!/\/de\/genjutsu-trends/.test(cookiePage));

for (const { slug } of TREND_PAGES) {
  const child = markup(await get(`/${slug}`));
  const hubLinks = links(child).filter((a) => a.href === '/genjutsu-trends');
  assert.ok(
    hubLinks.length >= 3,
    `${slug}: breadcrumb, related first item and bottom link`
  );
  assert.ok(
    hubLinks.filter((a) => a.label === 'All trending AI video memes').length >=
      2
  );
  const nav =
    [...child.matchAll(/<nav\b[^>]*>[\s\S]*?<\/nav>/g)].find((m) =>
      m[0].includes('data-testid="page-breadcrumbs"')
    )?.[0] || '';
  assert.ok(
    links(nav).some((a) => a.href === '/genjutsu-trends'),
    `${slug}: breadcrumb`
  );
  const related = child.match(
    /<section\b[^>]*id="related-trends"[^>]*>([\s\S]*?)<\/section>/
  )![1];
  assert.equal(links(related)[0].href, '/genjutsu-trends', slug);
  const studio =
    slug === '58th-floor-ai'
      ? 'floor-studio'
      : trendSections.find((s) => s.href === `/${slug}`)!.studio;
  assert.ok(child.includes(`id="${studio}"`), `${slug}: CTA target exists`);
}
const home = markup(await get('/'));
assert.ok(
  /<main\b[^>]*>[\s\S]*href="\/genjutsu-trends"[\s\S]*<\/main>/.test(home)
);
console.log(
  JSON.stringify(
    {
      status: 'PASS',
      introWords: count(trendsIntro.join(' ')),
      proseWords: count(allCopy.join(' ')),
      sectionCounts,
      keywords: { genjutsuTrends: primary, aiVideoTrends: secondary },
      canonical: TREND_HUB_URL,
      sitemapEntries: hubEntries.length,
      childPages: TREND_PAGES.length,
    },
    null,
    2
  )
);
