import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getTasks } from '@/modules/ai-tasks/service';
import { respData, respErr } from '@/lib/resp';

import { isStudioTask, taskView } from './-shared';

// The signed-in user's recent studio creations (newest first).
async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const tasks = await getTasks({ userId: session.user.id, limit: 40 });
    return respData(tasks.filter(isStudioTask).slice(0, 24).map(taskView));
  } catch (error: any) {
    return respErr(error?.message || 'Query failed');
  }
}

export const Route = createFileRoute('/api/studio/tasks')({
  server: { handlers: { GET } },
});
