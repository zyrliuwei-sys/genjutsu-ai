# Generator debugging — 2026-10-10

## Implemented

- Select EvoLink Kling O1 **video edit**, using the backend-configured EvoLink key;
  fal Kling O1 is the fallback only when EvoLink is not configured.
- Send source video, character reference image, aspect ratio and original audio
  to EvoLink. Do not substitute image-to-video or an upscaler.
- Check provider/storage readiness before uploading or charging credits.
- Reject incompatible local video duration/dimensions, image dimensions and
  provider upload limits before submission. EvoLink editing does not support
  the UI's 4:3 option; disable it rather than silently changing the ratio.
- Preserve the original ratio for the fal edit endpoint; reject mismatched ratios.
- Correct fal queue polling to owner/alias, matching its official SDK.
- Retry transient polling failures; recognize rejected/empty provider results.
- Preserve successful uploads on retry, display upload progress, resume the last
  task after reload, and keep a pending task locked while polling is unavailable.
- Separate demo rotation from the selected generation direction.
- Match internal directions to the actual reference clips, not legacy card names.
- Show only completed output in My Work; show empty/pending/error states otherwise.

## Verified

- `pnpm exec tsx scripts/test-genjutsu.ts`: offline request/prompt/queue/result
  regression checks pass; no paid requests or database writes in these tests.
- EvoLink `/v1/models`: authenticated HTTP 200; `kling-o1-video-edit` is listed.
- Browser: valid image/video selection and local preview, 9:16 selection,
  unsupported 4:3 disabled, long clip rejection, mute toggle, empty My Work,
  preview rotation without changing selected template, anonymous API rejection,
  Generate Now redirect to sign-in with `/create` callback.
- Production build and TypeScript check pass (rerun after final edits).

## Not yet verified / requires user configuration

- Local R2 access key and secret cannot be decrypted. The readiness endpoint
  reports `storageReady: false`; no local-only URL is sent to the provider.
- Content safety is enabled, but its private key cannot be decrypted either.
  Re-save that configuration as well; do not bypass the enabled safety check.
- Authenticated R2 upload, actual paid video edit, visual quality, final playback,
  download and credit/refund database behavior need a real end-to-end run once
  public storage is configured. No successful output is claimed yet.
- Model label still says Seedance 2.5 per the earlier no-copy-changes instruction;
  permission to correct it to Kling O1 was requested. It is not the actual model.
- EvoLink accepts max 100MB for this edit API; the unchanged UI's 200MB copy is
  not its limit. Client errors use the actual 100MB limit.
- Third-party demo videos are not evidence that our generation matches them.
  Commercial rights to those demos must be confirmed separately.

## Sources

- https://evolink.ai/kling-o1?model=kling-o1-video-edit (live Video Edit tab)
- https://fal.ai/models/fal-ai/kling-video/o1/video-to-video/edit/api
- https://github.com/fal-ai/fal-js/blob/main/libs/client/src/queue.ts
- https://higgsfield.ai/genjutsu
