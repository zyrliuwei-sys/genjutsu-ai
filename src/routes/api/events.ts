import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { isFunnelEvent, recordFunnelEvent } from '@/modules/funnel/service';
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
      props: cleanProps(body.props),
    });
    return respOk();
  } catch {
    return respErr('Invalid event');
  }
}

export const Route = createFileRoute('/api/events')({
  server: { handlers: { POST } },
});
