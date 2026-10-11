import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getTasks, retryFailedRefund } from '@/modules/ai-tasks/service';
import { getBalance, getHistory } from '@/modules/credits/service';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return respErr('Unauthorized');
    }

    // Also reconcile after a user returns later with no task tab open.
    const failed = await getTasks({
      userId: session.user.id,
      status: 'failed',
      limit: 100,
      refundPending: true,
    });
    for (const task of failed) await retryFailedRefund(task.id);
    const [balance, history] = await Promise.all([
      getBalance(session.user.id),
      getHistory(session.user.id),
    ]);

    return respData({ balance, history });
  } catch (error: any) {
    return respErr(error.message || 'Failed to get credits');
  }
}

export const Route = createFileRoute('/api/credits')({
  server: {
    handlers: { GET },
  },
});
