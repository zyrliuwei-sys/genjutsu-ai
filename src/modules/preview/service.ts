import { and, count, eq, gte, ne } from 'drizzle-orm';

import { db } from '@/core/db';
import { preview, type Preview } from '@/config/db/schema';
import { getUuid } from '@/lib/hash';

/**
 * Free, sign-in-free image previews. Each visitor (by hashed IP) gets a few
 * per day, and a site-wide daily cap bounds the worst-case spend.
 */

export const PREVIEW_PER_IP_PER_DAY = 3;
export const PREVIEW_DEFAULT_DAILY_CAP = 300;

const DAY_MS = 24 * 60 * 60 * 1000;

export type PreviewStatus = 'processing' | 'success' | 'failed';

async function countSince(since: Date, ipHash?: string) {
  const [row] = await db()
    .select({ total: count() })
    .from(preview)
    .where(
      and(
        gte(preview.createdAt, since),
        // Failed runs don't use up anyone's quota.
        ne(preview.status, 'failed'),
        ipHash ? eq(preview.ipHash, ipHash) : undefined
      )
    );
  return Number(row?.total ?? 0);
}

/** Remaining previews for this visitor today, and whether the site cap is hit. */
export async function getPreviewQuota(ipHash: string, dailyCap: number) {
  const since = new Date(Date.now() - DAY_MS);
  const [mine, all] = await Promise.all([
    countSince(since, ipHash),
    countSince(since),
  ]);
  return {
    remaining: Math.max(0, PREVIEW_PER_IP_PER_DAY - mine),
    siteCapReached: all >= dailyCap,
  };
}

export async function createPreview(params: {
  ipHash: string;
  prompt: string;
  aspect: string;
}): Promise<Preview> {
  const [row] = await db()
    .insert(preview)
    .values({
      id: getUuid(),
      ipHash: params.ipHash,
      prompt: params.prompt,
      aspect: params.aspect,
      status: 'processing',
    })
    .returning();
  return row;
}

export async function findPreview(id: string): Promise<Preview | undefined> {
  const [row] = await db()
    .select()
    .from(preview)
    .where(eq(preview.id, id))
    .limit(1);
  return row;
}

export async function updatePreview(
  id: string,
  patch: { status?: PreviewStatus; taskId?: string; url?: string }
) {
  await db().update(preview).set(patch).where(eq(preview.id, id));
}
