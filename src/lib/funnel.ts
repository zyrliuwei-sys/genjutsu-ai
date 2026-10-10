/** Deliberately allowlisted: never accept prompts, filenames, media URLs or PII. */
export type FunnelEvent =
  | 'studio_view'
  | 'sample_loaded'
  | 'upload_result'
  | 'generate_click'
  | 'generate_blocked'
  | 'pricing_view'
  | 'select_item'
  | 'begin_checkout'
  | 'checkout_created'
  | 'checkout_error'
  | 'draft_save_failed'
  | 'generation_started'
  | 'generation_complete'
  | 'generation_failed'
  | 'purchase';

export type FunnelProperties = {
  surface?: 'home' | 'create' | 'pricing' | 'dialog' | 'other';
  media_kind?: 'image' | 'video';
  outcome?:
    | 'success'
    | 'invalid'
    | 'missing_media'
    | 'insufficient_credits'
    | 'storage_unavailable'
    | 'request_failed';
  required_generations?: number;
  product_id?: 'pack_starter' | 'pack_creator' | 'pack_pro';
  payment_provider?:
    | 'stripe'
    | 'creem'
    | 'paypal'
    | 'alipay'
    | 'wechat'
    | 'waffo';
  value?: number;
  transaction_id?: string;
};

export function funnelPayload(input: FunnelProperties) {
  const output: Record<string, string | number> = {};
  const enums = {
    surface: ['home', 'create', 'pricing', 'dialog', 'other'],
    media_kind: ['image', 'video'],
    outcome: [
      'success',
      'invalid',
      'missing_media',
      'insufficient_credits',
      'storage_unavailable',
      'request_failed',
    ],
    product_id: ['pack_starter', 'pack_creator', 'pack_pro'],
    payment_provider: [
      'stripe',
      'creem',
      'paypal',
      'alipay',
      'wechat',
      'waffo',
    ],
  };
  for (const [key, allowed] of Object.entries(enums)) {
    const value = input[key as keyof FunnelProperties];
    if (typeof value === 'string' && allowed.includes(value))
      output[key] = value;
  }
  if (input.required_generations === 1 || input.required_generations === 2)
    output.required_generations = input.required_generations;
  if (
    typeof input.value === 'number' &&
    Number.isFinite(input.value) &&
    input.value >= 0 &&
    input.value < 10000
  ) {
    output.value = input.value;
    output.currency = 'USD';
  }
  if (
    input.transaction_id &&
    /^[A-Za-z0-9_-]{1,100}$/.test(input.transaction_id)
  )
    output.transaction_id = input.transaction_id;
  return output;
}

export function trackFunnelEvent(
  event: FunnelEvent,
  properties: FunnelProperties,
  enabled: boolean
) {
  if (!enabled || typeof window === 'undefined') return false;
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void })
    .gtag;
  if (!gtag) return false;
  try {
    gtag('event', event, {
      ...funnelPayload(properties),
      // Explicitly strip query/hash: old studio links can contain private prompts.
      page_location: window.location.origin + window.location.pathname,
      page_referrer: document.referrer ? new URL(document.referrer).origin : '',
    });
    return true;
  } catch {
    // Analytics must never interfere with uploads, rendering or checkout.
    return false;
  }
}
