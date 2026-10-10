# Draft recovery and 7× pricing — 2026-10-10

- Browser-observed EvoLink **Video Edit** pricing: $0.177/input second,
  billing range 3–10 seconds. The server-rendered marketing HTML incorrectly
  keeps the Image to Video tab ($0.118); hydrated selected tab and #pricing
  show the Video Edit rate. Source:
  https://evolink.ai/kling-o1?model=kling-o1-video-edit#pricing
- Retail math: `duration × $0.177 × 7 / $0.01`, rounded upward to 10 credits.
  3s = 380; 5s = 620; 10s = 1240. This is based on public list price, not an
  unverified account-specific VIP/discount rate. fal fallback uses the same
  conservative rate, above its published $0.168/s cost.
- New credit packs have no bonus dilution, amounts unchanged. Existing
  balances, created order snapshots and legacy subscriptions are untouched.
- Server reads ISO BMFF movie duration from uploaded bytes and signs a
  user/URL/duration/expiry receipt. Generation verifies the receipt before
  charging; arbitrary client duration and credit values are not trusted.
- IndexedDB stores Files and selection/ratio, not blob URLs. Draft namespace
  is per tab; anonymous drafts can be adopted after login. Other accounts
  cannot restore them through the application. Drafts expire after 24h and
  are purged on access/subsequent saves (not a background timer).
- Explicit committed save precedes login navigation, opening the paywall,
  and invoking checkout. Returning does not submit a paid generation.

Verified without payment or paid generation:

- Browser: valid video + image → select Burning Bridges + 9:16 → Generate →
  sign-in → return /create: both binary file previews and selections restored.
- Browser: binary integrity, anonymous adoption, cross-account isolation,
  expiry rejection; pricing cards show correct 5/10s counts and pack credits.
- Offline tests: markup for 3–10s, MP4 duration, signed-receipt verification,
  rejection of altered duration, another user or a different media URL;
  existing provider regressions pass.

Not verified: real authenticated checkout/payment-return, R2 upload and
actual model billing/output. Previously reported R2 and prompt-safety key
decryption failures still require admin configuration repair.
