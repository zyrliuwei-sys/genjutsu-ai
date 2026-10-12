import { db } from '@/core/db';
import { funnelEvent } from '@/config/db/schema';
import { getUuid } from '@/lib/hash';

export const FUNNEL_EVENTS = [
  'create_view',
  'hero_cta',
  'effect_select',
  'page_exit',
  'lead_uploaded',
  'reference_ready',
  'generate_click',
  'signin_redirect',
  'signin_resume',
  'paywall_shown',
  'plan_click',
  'provider_modal_shown',
  'provider_selected',
  'checkout_redirect',
  'checkout_failed',
  'generate_submitted',
  'preview_click',
  'preview_ready',
  'preview_failed',
  'preview_cta',
] as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[number];

export function isFunnelEvent(value: unknown): value is FunnelEventName {
  return FUNNEL_EVENTS.includes(value as FunnelEventName);
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
      props: input.props ? JSON.stringify(input.props).slice(0, 500) : '',
    });
}
