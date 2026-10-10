# First-generation funnel

This version does not change prices, grant free credits, upload practice media
automatically, or label third-party videos as our generated results.

## GA4 events

- `studio_view`: studio mounted (home/create).
- `sample_loaded`: practice files loaded, or failed to load. Loading is free.
- `upload_result`: image/video accepted or rejected by local validation.
- `generate_click` / `generate_blocked`: one click vs a missing-media/credit block.
- `pricing_view`: pricing section/dialog viewed.
- `select_item`: pack clicked, including clicks before sign-in.
- `draft_save_failed`: local draft storage failed.
- `begin_checkout`: actual checkout API attempt (after provider selection).
- `checkout_created` / `checkout_error`: checkout URL received vs failed request.
- `purchase`: ONLY after the authenticated orders API reports the matching
  returned order as `paid`. Deduplicated by order number. An arbitrary success
  URL or `checkout_order` query parameter cannot create a purchase event.
- `generation_started` / `generation_complete` / `generation_failed`: real task
  creation and terminal status, not a simulated result.

Custom event properties are allowlisted. No emails, user IDs, filenames, raw
prompts, media URLs, error messages or arbitrary URL queries are sent. Admins,
unresolved user permissions and local development are excluded. This does not
alter a GA property's existing automatic page-view/consent configuration.
GA4's configured tag must be available; ad blockers can prevent collection.

Purchase tracking covers browser returns, not server-to-server purchases where
the visitor never returns. For financial reconciliation use the orders table,
not GA4. A later server-side integration would require separate credentials.

## Practice files and real comparisons

The generator no longer offers selectable third-party effect templates. It
previews the user's input video. Background defaults to `keep`; `change` requires
a description (up to 500 characters). The server constructs the corresponding
instruction and ignores legacy effect prompts. These are model instructions,
not a guarantee of pixel-identical background preservation. Both options and
the description survive local draft recovery; descriptions are not analytics
properties.

Four practice sets now use one user-provided dance video, three existing homepage
third-party references (dojo, rooftop and crowd; reuse permission required before
publication) and four distinct stock character photos: black-and-gold
skirt dance, two-person dojo fight with only the white-gi lead recast,
rooftop furniture-jump parkour and fire-background ensemble dance. No generation API was used
for this v4 replacement. Previous generated assets remain archived.
Motion instructions, provenance and retained stock-photo sources are recorded in
`practice-media-sources.md`. These inputs are not evidence of Kling O1 edit quality.
The source/output comparison pins the actual source to
the generated task. It does not substitute a newly selected file for an old
result. Public promotional before/after cases still require genuine matching
Kling O1 input/output assets.

All four prepared clips are continuous, exactly five seconds, H.264 without
audio, at 1280×720 for landscape clips and 720×1280 for portrait dance,
without letterboxing or stretching. They contain 120 frames at 24 fps to stay
within the five-second tier. Old assets remain untouched.
Each selected sample submits its ID for server-resolved motion guidance;
a custom source upload or source removal clears it.
Each upload slot can clear its asset independently without deleting a saved
generated task or its pinned comparison source.

## Verification

Run `pnpm exec tsx scripts/test-conversion-flow.ts`, existing offline generation
and pricing tests, and `pnpm build`. Browser QA should use mocked checkout and
generation API responses: never create a real checkout or paid render merely
to test the UI. Check narrow screens, 5s vs >5s pricing, nested payment dialogs,
reload/auth draft recovery and blocked IndexedDB.
