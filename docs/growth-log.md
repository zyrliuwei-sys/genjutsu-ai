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
