import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { findTask } from '@/modules/ai-tasks/service';
import { getAllConfigs } from '@/modules/config/service';
import { respData, respErr } from '@/lib/resp';

import { isStudioTask, refreshTask } from './-shared';

// Poll one studio task; each poll asks the provider for the latest status.
async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return respErr('id is required');

    const task = await findTask(id);
    if (!task || task.userId !== session.user.id || !isStudioTask(task)) {
      return respErr('Task not found');
    }

    return respData(await refreshTask(task, await getAllConfigs()));
  } catch (error: any) {
    return respErr(error?.message || 'Query failed');
  }
}

export const Route = createFileRoute('/api/studio/task')({
  server: { handlers: { GET } },
});
