import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';

/** Only an owner's permanently stored result may be proxied, never arbitrary URLs. */
export async function getDownload(
  userId: string,
  id: string,
  storageDomain: string
) {
  const [task] = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.id, id),
        eq(aiTask.userId, userId),
        isNull(aiTask.deletedAt)
      )
    )
    .limit(1);
  if (!task || task.status !== 'success')
    throw new Error('Download unavailable');
  const result = JSON.parse(task.taskResult || '{}');
  if (result.archivePending)
    throw new Error('Your video is still being saved. Please retry shortly.');
  const video = Boolean(result.video?.url);
  const url = new URL(result.video?.url ?? result.images?.[0]?.url);
  const storage = new URL(storageDomain);
  if (
    url.protocol !== 'https:' ||
    url.origin !== storage.origin ||
    url.username ||
    url.password
  )
    throw new Error('Download unavailable');
  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok || !response.body)
    throw new Error('Could not retrieve your file. Please retry.');
  return {
    body: response.body,
    type: video ? 'video/mp4' : 'image/png',
    filename: `genjutsu-${id.replace(/[^a-zA-Z0-9_-]/g, '')}.${video ? 'mp4' : 'png'}`,
  };
}
