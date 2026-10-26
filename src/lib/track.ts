// Funnel tracking: mirrors each event to GA4 (when gtag is loaded) and to
// /api/events (D1 `funnel_event`) so conversion drop-off can be queried.

import { v4 as uuidv4 } from 'uuid';

const ANON_KEY = 'genjutsu-anon-id';

function anonId() {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      // uuid falls back to getRandomValues where crypto.randomUUID is missing.
      id = uuidv4();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return 'anon-unavailable';
  }
}

export function track(
  event: string,
  props?: Record<string, string | number | boolean>
) {
  if (typeof window === 'undefined') return;
  try {
    (window as any).gtag?.('event', event, props);
    const body = JSON.stringify({
      event,
      anonId: anonId(),
      path: window.location.pathname,
      // Release the visitor saw; 'dev' rows are local testing (excluded from analytics).
      v: import.meta.env.DEV ? 'dev' : __BUILD_ID__,
      props,
    });
    if (!navigator.sendBeacon?.('/api/events', body))
      void fetch('/api/events', { method: 'POST', body, keepalive: true });
  } catch {
    // Tracking must never break the product flow.
  }
}
