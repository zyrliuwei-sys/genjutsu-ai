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
