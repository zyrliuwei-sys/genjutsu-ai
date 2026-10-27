import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import {
  listFeedbackCandidates,
  sendCheckoutFeedbackEmails,
} from '@/modules/payment-recovery/service';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr } from '@/lib/resp';

async function requireAdmin(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return 'Unauthorized';
  if (!(await hasPermission(session.user.id, 'admin.*'))) return 'Forbidden';
  return null;
}

// Users who left a checkout unpaid and never paid, with reminder/feedback state.
async function GET({ request }: { request: Request }) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return respErr(denied);
    return respData(await listFeedbackCandidates());
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

// Send the "what stopped you?" email to the picked users.
async function POST({ request }: { request: Request }) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return respErr(denied);
    const { userIds } = await request.json();
    if (
      !Array.isArray(userIds) ||
      !userIds.length ||
      !userIds.every((id) => typeof id === 'string')
    )
      return respErr('userIds is required');
    const result = await sendCheckoutFeedbackEmails(
      await getAllConfigs(),
      userIds
    );
    return respData(result);
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

export const Route = createFileRoute('/api/admin/checkout-feedback')({
  server: { handlers: { GET, POST } },
});
