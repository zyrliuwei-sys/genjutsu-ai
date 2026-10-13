import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { isFunnelEvent, recordFunnelEvent } from '@/modules/funnel/service';
import { getCookieFromHeader } from '@/lib/cookie';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respErr, respOk } from '@/lib/resp';

type Props = Record<string, string | number | boolean>;

function cleanProps(value: unknown): Props | undefined {
  if (!value || typeof value !== 'object') return;
  const props: Props = {};
  for (const [key, v] of Object.entries(value).slice(0, 10)) {
    if (['string', 'number', 'boolean'].includes(typeof v))
      props[key.slice(0, 40)] = typeof v === 'string' ? v.slice(0, 100) : v;
  }
  return props;
}

// Server-side attribution on every event, so anonymous drop-off can be split
// by source and country: `src` is the first-touch cookie set in server.ts,
// `country` the edge-provided cf-ipcountry header.
function trafficProps(request: Request): Props {
  const props: Props = {};
  const src = getCookieFromHeader(request.headers.get('cookie'), 'utm_source');
  if (src) props.src = src.replace(/[^\w.\-]/g, '').slice(0, 100);
  const country = request.headers.get('cf-ipcountry');
  if (country) props.country = country.slice(0, 8);
  return props;
}

// Sent via navigator.sendBeacon (text/plain body) so it survives navigation.
async function POST({ request }: { request: Request }) {
  // Funnel steps are seconds apart; this only stops scripted floods.
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 200,
    keyPrefix: 'funnel-event',
  });
  if (limited) return limited;
  try {
    const body = JSON.parse(await request.text());
    const anonId = typeof body?.anonId === 'string' ? body.anonId : '';
    if (!isFunnelEvent(body?.event) || !/^[\w-]{8,64}$/.test(anonId))
      return respErr('Invalid event');

    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    await recordFunnelEvent({
      event: body.event,
      anonId,
      userId: session?.user?.id,
      path: typeof body.path === 'string' ? body.path : '',
      props: { ...cleanProps(body.props), ...trafficProps(request) },
    });
    return respOk();
  } catch {
    return respErr('Invalid event');
  }
}

export const Route = createFileRoute('/api/events')({
  server: { handlers: { POST } },
});
