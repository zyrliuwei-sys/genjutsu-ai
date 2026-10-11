/**
 * Free still preview: one per account (lifetime), only for visitors whose
 * Cloudflare edge country is listed here. Everyone else goes straight to the
 * paywall.
 */

// Seedream 5.0 Flash on EvoLink: $0.017/image flat, up to 10 free reference
// images. Verified on https://evolink.ai/seedream-5-0-flash (2026-10-11).
export const GENJUTSU_PREVIEW_MODEL = 'doubao-seedream-5.0-flash';

/** Accounts per IP address (lifetime) — stops sign-up farming for previews. */
export const GENJUTSU_PREVIEW_PER_IP = 2;
/** Site-wide previews per rolling 24h; override with `genjutsu_preview_daily_cap`. */
export const GENJUTSU_PREVIEW_DEFAULT_DAILY_CAP = 300;

// EU-27 + EEA (IS, LI, NO), then US, CA, GB, CH, AU, NZ. IE is in the EU list.
const EU_EEA =
  'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO';

export const GENJUTSU_PREVIEW_COUNTRIES: ReadonlySet<string> = new Set([
  ...EU_EEA.split(' '),
  ...'US CA GB CH AU NZ'.split(' '),
]);

export function isPreviewCountry(country?: string | null) {
  return Boolean(
    country && GENJUTSU_PREVIEW_COUNTRIES.has(country.toUpperCase())
  );
}

export function buildPreviewPrompt(direction = '') {
  return [
    'Image 1 shows the main character. Image 2 is a frame from a reference video.',
    'Recreate Image 2 as a single photorealistic frame with the person from Image 1 replacing the main performer.',
    "Keep Image 2's scene, pose, body position, camera angle, framing, lighting and background exactly.",
    "Keep Image 1's face, hairstyle, skin tone and outfit identity. No text, no borders.",
    direction,
  ]
    .filter(Boolean)
    .join(' ');
}
