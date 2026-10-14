import { db } from '@/core/db';
import { funnelEvent } from '@/config/db/schema';
import { getUuid } from '@/lib/hash';

export const FUNNEL_EVENTS = [
  // Every client-side page load / navigation (public pages only).
  'page_view',
  'create_view',
  'hero_cta',
  'sticky_cta',
  'effect_select',
  'page_exit',
  'lead_uploaded',
  'reference_ready',
  'generate_click',
  'signin_redirect',
  'signin_resume',
  'paywall_shown',
  'paywall_closed',
  'plan_click',
  'provider_modal_shown',
  'provider_selected',
  'checkout_redirect',
  'checkout_failed',
  'generate_submitted',
  // Generate click stopped by an error (props: stage, error).
  'generate_error',
  // Accepted task that the provider failed (props: kind).
  'generate_failed',
] as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[number];

export function isFunnelEvent(value: unknown): value is FunnelEventName {
  return FUNNEL_EVENTS.includes(value as FunnelEventName);
}

// Attribution keys added server-side; kept when the client props overflow.
const ATTRIBUTION_KEYS = ['src', 'country', 'v'];
const MAX_PROPS_LENGTH = 1000;

// Never cut the JSON mid-string: analytics queries json_extract these rows.
function serializeProps(props?: Record<string, string | number | boolean>) {
  if (!props) return '';
  const json = JSON.stringify(props);
  if (json.length <= MAX_PROPS_LENGTH) return json;
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(props).filter(([key]) => ATTRIBUTION_KEYS.includes(key))
    )
  );
}

export async function recordFunnelEvent(input: {
  event: FunnelEventName;
  anonId: string;
  userId?: string | null;
  path?: string;
  props?: Record<string, string | number | boolean>;
}) {
  await db()
    .insert(funnelEvent)
    .values({
      id: getUuid(),
      event: input.event,
      anonId: input.anonId,
      userId: input.userId || null,
      path: (input.path || '').slice(0, 200),
      props: serializeProps(input.props),
    });
}
