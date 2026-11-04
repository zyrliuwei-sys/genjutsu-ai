# Growth log

Every data read, hypothesis, change and result — one entry per change, newest
first. Fill in "Result" once the change has enough traffic to judge.
Numbers come from `/admin/analytics` (counting rules in its footnote).

Template:

```
## YYYY-MM-DD — <change>
- Data read: <what the numbers showed, with numbers>
- Hypothesis: <why this change should help>
- Change: <commit / build id shown in the Version column>
- Experiment: <A/B split, metric (revenue per unique paywall viewer), sample target>
- Result: <date judged, numbers, decision: keep / revert>
```

## 2026-11-04 — Static trend links and intent separation

- Data read: authenticated GSC URL-prefix property, Web, Oct 5–Nov 1 (28 days).
  Homepage has 4,834 clicks. `/ai-genjutsu-generator` has 493 impressions and
  2 clicks; `/higgsfield-genjutsu-alternative` has 475 impressions and 2 clicks.
  `genjutsu ai` supplies 347 and 364 of those impressions respectively.
  `higgsfield genjutsu alternative` supplies 3 impressions and 1 click.
  Exact query rows and trend-page baselines are recorded in
  `docs/research/gsc-intent-2026-11-04.json`.
- Observation: homepage footer links already existed in live HTML, and the
  live sitemap already used slashless URLs. The new work adds prominent body
  links. Slash variants previously returned temporary 307 redirects.
- Change, in order: nine server-rendered homepage trend cards; ten linked
  Effects headings plus nine trend destinations; four related links on each
  trend page; explicit slashless public routes and permanent slash redirects;
  GSC-informed input-reference and alternative-comparison positioning for the two
  English content pages, with body copy aligned to the current editor.
- Hypothesis: more contextual entrances and clearer intent will improve
  discovery and qualified clicks. Shared brand impressions alone do not prove
  harmful cannibalization, and the narrower reference positioning is an editorial test.
- Validation: use `SEO_TEST_ORIGIN=<origin> node scripts/test-trend-seo.mjs`
  for curl-only HTML checks of links, canonical/hreflang, redirects, protected
  homepage title/H1, robots and the revised metadata.
- Follow-up: 14–21 days after actual deployment, compare equal complete periods
  in GSC's page report and inspect each trend page's query mix. Some trend pages
  already have 1–8 impressions; missing rows are not asserted to be zero.
- Result: pending release and post-release observation.

## 2026-11-04 — Upfront video pricing and direct payment

- Data read (2026-10-28 through 2026-11-03, Beijing time; known test
  accounts and dev events excluded): 1,900 visitors, 516 paywall viewers,
  49 visitors with both paywall and plan-click events (9.5%), 23 checkout
  visitors, 2 payers, $64.50 in paid orders. This is the pre-change baseline.
- Hypothesis: showing the entry price before upload, describing a purchase
  as the selected video, and placing payment methods beside the total will
  help visitors decide and complete a first purchase.
- Change: price on the hero CTA and first-generation controls; video-count
  labels and $9.90 default on pricing; selected effect/duration/aspect/MP4
  summary; card and PayPal as direct purchase actions; larger packs collapsed.
  Server prices, balances, and generation charges remain unchanged.
- Tracking: `plan_click` and `checkout_redirect` include provider, product,
  and `flow=direct_payment_v1`. The provider-picker step is removed; do not
  compare its event count with the old flow. Existing build IDs identify the
  release. A plan click still means a purchase-action click, not a radio change.
- Experiment: one combined rollout, not an A/B test. Compare two complete
  weeks after deployment with the baseline, split by source/country. Primary
  metric: revenue per 1,000 unique visitors; also check first-time payer rate,
  paywall-to-purchase-action rate, checkout completion, and delivery errors.
  More clicks alone do not establish an improvement.
- Result: pending deployment and post-release traffic; no uplift claimed.

## 2026-10-14 — Analytics baseline

- Data read (last 7 days, test accounts excluded): 1239 visitors → 534 uploaded
  → 513 clicked generate → 401 saw the paywall → 36 clicked a plan → 11 went
  to checkout → 6 paid ($69.40). By country, IN 116 visitors / 1 payer, US 34 / 0.
- Change: every funnel event now carries the build id (`v`); site-wide
  `page_view` event; `/admin/analytics` dashboard (today vs yesterday same
  time, 14-day daily table, funnel by source / country / version).
- Known data issues: source & country only since 10-13; Waffo orders store
  `paid_at` truncated to the UTC day (dashboard uses `updated_at` instead);
  `page_view` raises visitor counts from this release on, so compare visitors
  across the release boundary with care.
- Result: n/a (baseline).
