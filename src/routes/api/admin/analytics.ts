import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAnalyticsOverview } from '@/modules/analytics/service';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr } from '@/lib/resp';

const RANGES = [1, 7, 30];

async function GET({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized');
    if (!(await hasPermission(session.user.id, 'admin.*')))
      return respErr('Forbidden');

    const days = Number(new URL(request.url).searchParams.get('days'));
    return respData(
      await getAnalyticsOverview(RANGES.includes(days) ? days : 7)
    );
  } catch (e: any) {
    console.error('analytics overview failed:', e);
    return respErr(e.message || 'Failed to load analytics');
  }
}

export const Route = createFileRoute('/api/admin/analytics')({
  server: { handlers: { GET } },
});
