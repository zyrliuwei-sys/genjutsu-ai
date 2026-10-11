import { and, count, eq, gte, ne } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  account,
  genjutsuPreview,
  type GenjutsuPreview,
} from '@/config/db/schema';
import { getUuid } from '@/lib/hash';

export type GenjutsuPreviewStatus = 'processing' | 'success' | 'failed';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Free previews are only for accounts signed in with Google (incl. One Tap). */
export async function hasGoogleAccount(userId: string) {
  const [row] = await db()
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'google')))
    .limit(1);
  return Boolean(row);
}

export async function findUserPreview(
  userId: string
): Promise<GenjutsuPreview | undefined> {
  const [row] = await db()
    .select()
    .from(genjutsuPreview)
    .where(eq(genjutsuPreview.userId, userId))
    .limit(1);
  return row;
}

/** Previews that used up an IP's allowance (failed runs don't count). */
export async function countIpPreviews(ipHash: string) {
  const [row] = await db()
    .select({ total: count() })
    .from(genjutsuPreview)
    .where(
      and(
        eq(genjutsuPreview.ipHash, ipHash),
        ne(genjutsuPreview.status, 'failed')
      )
    );
  return Number(row?.total ?? 0);
}

export async function countRecentPreviews() {
  const [row] = await db()
    .select({ total: count() })
    .from(genjutsuPreview)
    .where(
      and(
        gte(genjutsuPreview.createdAt, new Date(Date.now() - DAY_MS)),
        ne(genjutsuPreview.status, 'failed')
      )
    );
  return Number(row?.total ?? 0);
}

/**
 * Claim the account's single lifetime preview. Returns the claimed row, or
 * null if the account already has a processing/successful preview. A failed
 * preview is reclaimed so a provider error never burns the free try.
 */
export async function claimPreview(params: {
  userId: string;
  ipHash: string;
  country: string;
  aspect: string;
}): Promise<GenjutsuPreview | null> {
  const existing = await findUserPreview(params.userId);
  if (existing) {
    if (existing.status !== 'failed') return null;
    const [row] = await db()
      .update(genjutsuPreview)
      .set({ ...params, status: 'processing', taskId: null, url: null })
      .where(
        and(
          eq(genjutsuPreview.id, existing.id),
          eq(genjutsuPreview.status, 'failed')
        )
      )
      .returning();
    return row ?? null;
  }
  try {
    const [row] = await db()
      .insert(genjutsuPreview)
      .values({ id: getUuid(), ...params, status: 'processing' })
      .returning();
    return row;
  } catch {
    // Unique user_id: a concurrent request claimed it first.
    return null;
  }
}

export async function updatePreview(
  id: string,
  patch: { status?: GenjutsuPreviewStatus; taskId?: string; url?: string }
) {
  await db()
    .update(genjutsuPreview)
    .set(patch)
    .where(eq(genjutsuPreview.id, id));
}
