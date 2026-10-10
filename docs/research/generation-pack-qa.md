# Generation packs — 2026-10-10

Supersedes the former money-denominated pack grants in
`genjutsu-draft-pricing-qa.md`. No database balances, historical orders,
payment-provider dashboard products or reference files were changed.

| Pack    |   USD | Internal units | User-visible allowance                            |
| ------- | ----: | -------------: | ------------------------------------------------- |
| Trial   |  6.90 |            620 | 1 generation up to 5s                             |
| Creator | 24.90 |           2480 | 4 up-to-5s generations OR 2 up-to-10s generations |
| Batch   | 49.90 |           4960 | 8 up-to-5s generations OR 4 up-to-10s generations |

- Three packs only; Creator is recommended. The retired $79 pack is also
  blocked from new checkout, not merely hidden. Its historical order snapshots
  remain untouched.
- Every accepted 3–5s input costs 620 internal units; >5s to 10s costs 1240.
  Duration is verified using the existing server-signed upload receipt.
  A source of 5.01s therefore uses TWO generations; no imprecise tolerance
  can silently allow a >5s input at the one-generation rate.
- Backend accounting remains in existing credit tables, with no schema/data
  conversion. Displayed remaining generations = floor(balance / 620).
  Legacy partial balances are retained and can combine with purchases, with
  an explanatory note. Old paid units retain their original value.
- Each new pack's effective price per 5s generation remains above
  $0.177 × 5 × 7 = $6.195. Displaying exact generation counts no longer creates
  fresh unexplained leftover balances.
- Server ignores client-supplied price/allowance. Admin test-price overrides
  now apply only to admins, never regular buyers. Creem validates its mapped
  product's actual price/currency before creating a checkout, so an old $9.90
  product cannot silently charge the new $6.90 Trial pack incorrectly.
- Both pricing and generator display generation counts, not internal credits.
  Technical-failure refund behavior uses the existing task credit revocation;
  completed-but-disliked outputs consume attempts. Terms are shown on pricing.
- Public reference video is labeled as Higgsfield footage and not generated
  by this service. No claim of our output matching those clips is made.

Checks: offline pack/markup/boundary/retirement/signature/Creem guard tests;
existing provider regression; TypeScript; production build; rendered pricing
and generator HTML (three prices, counts, no visible credits, reference label).
No real checkout, payment or paid generation was submitted.

Live local config check still reports `storageReady: false` and
`safetyReady: false`, so real generation/output/refund acceptance remains
pending repair of the R2 and Waffo safety credentials in Admin Settings.
