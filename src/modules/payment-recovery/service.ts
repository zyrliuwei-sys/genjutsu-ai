import { and, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';

import { getEmailBrand, getEmailProvider } from '@/core/auth';
import { db } from '@/core/db';
import { NoticeEmail } from '@/core/email/templates/notice-email';
import { envConfigs } from '@/config';
import { funnelEvent, order, user } from '@/config/db/schema';
import { getUuid } from '@/lib/hash';

/**
 * Unpaid-checkout reminder: one email per user, sent by the cron
 * (src/nitro/genjutsu-cron.ts) once an order has stayed `created` for an hour.
 * Sends, clicks and unsubscribes are logged as server-only `funnel_event`
 * rows (never accepted from /api/events), so they sit next to the funnel.
 *
 * The reminder also lists one-click "why didn't you buy?" answers. The same
 * question can be sent on its own from admin → payments to users who never
 * got it; answers come back through /api/email/feedback, logged the same way.
 */

const HOUR = 60 * 60 * 1000;
const SEND_AFTER = HOUR;
// Older orders are left alone (first deploy must not mail a stale backlog).
const SEND_BEFORE = 48 * HOUR;
// At most one reminder per user per week, whatever the number of orders.
const USER_COOLDOWN = 7 * 24 * HOUR;
const MAX_PER_RUN = 10;

export const RECOVERY_EVENTS = {
  sent: 'recovery_email_sent',
  click: 'recovery_email_click',
  unsubscribe: 'email_unsubscribe',
  feedbackSent: 'checkout_feedback_sent',
  feedbackReply: 'checkout_feedback_reply',
} as const;

type RecoveryAction = 'click' | 'unsub' | 'feedback';

export const FEEDBACK_REASONS = {
  price: 'The price is too high for me',
  payment_failed: 'My payment failed or got declined',
  payment_method: "My payment method wasn't available",
  unsure: "I wasn't sure the results would be good enough",
  just_looking: 'I was just looking around',
  other: 'Something else',
} as const;

export type FeedbackReason = keyof typeof FEEDBACK_REASONS;

function feedbackOptions(siteUrl: string, feedbackToken: string) {
  return Object.entries(FEEDBACK_REASONS).map(([reason, text]) => ({
    text,
    url: `${siteUrl}/api/email/feedback?t=${feedbackToken}&r=${reason}`,
  }));
}

export function isFeedbackReason(value: unknown): value is FeedbackReason {
  return typeof value === 'string' && Object.hasOwn(FEEDBACK_REASONS, value);
}

// --- Signed links -----------------------------------------------------------

async function signingKey() {
  if (!envConfigs.auth_secret) throw new Error('Server signing key is missing');
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(envConfigs.auth_secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(value: string) {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** `<userId>.<orderNo>.<action>.<sig>` — no expiry: unsubscribe must keep working. */
async function signToken(
  userId: string,
  orderNo: string,
  action: RecoveryAction
) {
  const payload = `${userId}.${orderNo}.${action}`;
  const sig = await crypto.subtle.sign(
    'HMAC',
    await signingKey(),
    new TextEncoder().encode(payload)
  );
  return `${payload}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifyRecoveryToken(token: unknown) {
  if (typeof token !== 'string' || token.length > 300) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [userId, orderNo, action, sig] = parts;
  if (action !== 'click' && action !== 'unsub' && action !== 'feedback')
    return null;
  try {
    const ok = await crypto.subtle.verify(
      'HMAC',
      await signingKey(),
      fromBase64Url(sig),
      new TextEncoder().encode(`${userId}.${orderNo}.${action}`)
    );
    return ok ? { userId, orderNo, action: action as RecoveryAction } : null;
  } catch {
    return null;
  }
}

// --- Event log --------------------------------------------------------------

async function logEvent(
  event: (typeof RECOVERY_EVENTS)[keyof typeof RECOVERY_EVENTS],
  userId: string,
  props: Record<string, string | undefined>
) {
  await db()
    .insert(funnelEvent)
    .values({
      id: getUuid(),
      event,
      userId,
      // Server-side rows have no browser id; key them on the user.
      anonId: `user-${userId}`.slice(0, 64),
      path: '',
      props: JSON.stringify(props),
    });
}

async function hasEvent(userId: string, event: string, since?: Date) {
  const [row] = await db()
    .select({ id: funnelEvent.id })
    .from(funnelEvent)
    .where(
      and(
        eq(funnelEvent.userId, userId),
        eq(funnelEvent.event, event),
        since ? gte(funnelEvent.createdAt, since) : undefined
      )
    )
    .limit(1);
  return Boolean(row);
}

export async function recordRecoveryClick(userId: string, orderNo: string) {
  await logEvent(RECOVERY_EVENTS.click, userId, { order_no: orderNo });
}

export async function unsubscribeRecoveryEmails(
  userId: string,
  orderNo: string
) {
  if (await hasEvent(userId, RECOVERY_EVENTS.unsubscribe)) return;
  await logEvent(RECOVERY_EVENTS.unsubscribe, userId, { order_no: orderNo });
}

// --- Sending ----------------------------------------------------------------

function formatAmount(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/** Called from the cron; returns how many reminders went out. */
export async function sendPaymentRecoveryEmails(
  configs: Record<string, string>
) {
  const emailCtx = getEmailProvider(configs);
  if (!emailCtx) return 0;
  const { appName, siteUrl, logoUrl } = getEmailBrand(configs);
  if (!siteUrl) return 0;

  const now = Date.now();
  const candidates = await db()
    .select({
      userId: order.userId,
      orderNo: order.orderNo,
      amount: order.amount,
      currency: order.currency,
      planName: order.planName,
      productName: order.productName,
      createdAt: order.createdAt,
      email: user.email,
      name: user.name,
    })
    .from(order)
    .innerJoin(user, eq(user.id, order.userId))
    .where(
      and(
        eq(order.status, 'created'),
        isNull(order.deletedAt),
        eq(user.emailVerified, true),
        lte(order.createdAt, new Date(now - SEND_AFTER)),
        gte(order.createdAt, new Date(now - SEND_BEFORE))
      )
    )
    .orderBy(desc(order.createdAt))
    .limit(100);

  let sent = 0;
  const seen = new Set<string>();
  for (const row of candidates) {
    if (sent >= MAX_PER_RUN) break;
    // Newest unpaid order per user only.
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);

    const [paidLater] = await db()
      .select({ id: order.id })
      .from(order)
      .where(
        and(
          eq(order.userId, row.userId),
          eq(order.status, 'paid'),
          gte(order.createdAt, row.createdAt)
        )
      )
      .limit(1);
    if (paidLater) continue;
    if (await hasEvent(row.userId, RECOVERY_EVENTS.unsubscribe)) continue;
    if (
      await hasEvent(
        row.userId,
        RECOVERY_EVENTS.sent,
        new Date(now - USER_COOLDOWN)
      )
    )
      continue;

    const clickUrl = `${siteUrl}/api/email/recovery?t=${encodeURIComponent(
      await signToken(row.userId, row.orderNo, 'click')
    )}`;
    const unsubUrl = `${siteUrl}/api/email/recovery?t=${encodeURIComponent(
      await signToken(row.userId, row.orderNo, 'unsub')
    )}`;
    const feedbackToken = encodeURIComponent(
      await signToken(row.userId, row.orderNo, 'feedback')
    );
    const plan = row.planName || row.productName || 'your plan';
    const price = formatAmount(row.amount, row.currency);
    const name = row.name?.trim();

    const result = await emailCtx.provider.sendEmail({
      to: row.email,
      subject: `Your ${appName} checkout is still open`,
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: ['payment_recovery'],
      react: NoticeEmail({
        appName,
        logoUrl,
        preview: `You started checking out ${plan} (${price}) but didn't finish.`,
        heading: name
          ? `${name}, you're one step away`
          : "You're one step away",
        paragraphs: [
          `You started checking out ${plan} (${price}) on ${appName} but the payment didn't go through.`,
          'If something went wrong at checkout, you can pick up where you left off — it only takes a minute.',
        ],
        ctaText: 'Continue to payment',
        ctaUrl: clickUrl,
        optionsTitle:
          'Decided not to buy? Mind telling us why? One click helps us a lot:',
        options: feedbackOptions(siteUrl, feedbackToken),
        footer: `You're receiving this because you started a checkout at ${appName}.`,
        unsubscribeUrl: unsubUrl,
      }),
    });
    if (!result.success) {
      console.error('[payment-recovery] send failed:', result.error);
      continue;
    }
    const logged = {
      order_no: row.orderNo,
      ...(result.messageId && { message_id: result.messageId }),
    };
    await logEvent(RECOVERY_EVENTS.sent, row.userId, logged);
    // The reminder already asks why, so the admin feedback email skips them.
    await logEvent(RECOVERY_EVENTS.feedbackSent, row.userId, logged);
    sent++;
  }
  return sent;
}

// --- Checkout feedback ------------------------------------------------------

const FEEDBACK_MAX_PER_SEND = 50;

function parseProps(raw: string | null) {
  try {
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export interface FeedbackCandidate {
  userId: string;
  email: string;
  name: string | null;
  orderNo: string;
  amount: number;
  currency: string;
  plan: string | null;
  orderCreatedAt: Date;
  unpaidOrders: number;
  reminderSentAt: Date | null;
  feedbackSentAt: Date | null;
  reply: { reason: string; note?: string; at: Date } | null;
}

/**
 * Users with a verified email who left at least one checkout unpaid and have
 * never paid for anything, newest first, with what we already sent them.
 */
export async function listFeedbackCandidates(): Promise<FeedbackCandidate[]> {
  const unpaid = await db()
    .select({
      userId: order.userId,
      orderNo: order.orderNo,
      amount: order.amount,
      currency: order.currency,
      planName: order.planName,
      productName: order.productName,
      createdAt: order.createdAt,
      email: user.email,
      name: user.name,
    })
    .from(order)
    .innerJoin(user, eq(user.id, order.userId))
    .where(
      and(
        eq(order.status, 'created'),
        isNull(order.deletedAt),
        eq(user.emailVerified, true)
      )
    )
    .orderBy(desc(order.createdAt))
    .limit(500);
  if (!unpaid.length) return [];

  const userIds: string[] = [
    ...new Set<string>(unpaid.map((row: { userId: string }) => row.userId)),
  ];
  const paid = await db()
    .select({ userId: order.userId })
    .from(order)
    .where(and(inArray(order.userId, userIds), eq(order.status, 'paid')));
  const payers = new Set(paid.map((row: { userId: string }) => row.userId));

  const events = await db()
    .select({
      userId: funnelEvent.userId,
      event: funnelEvent.event,
      props: funnelEvent.props,
      createdAt: funnelEvent.createdAt,
    })
    .from(funnelEvent)
    .where(
      and(
        inArray(funnelEvent.userId, userIds),
        inArray(funnelEvent.event, [
          RECOVERY_EVENTS.sent,
          RECOVERY_EVENTS.unsubscribe,
          RECOVERY_EVENTS.feedbackSent,
          RECOVERY_EVENTS.feedbackReply,
        ])
      )
    )
    .orderBy(desc(funnelEvent.createdAt));

  const byUser = new Map<string, FeedbackCandidate>();
  for (const row of unpaid) {
    if (payers.has(row.userId)) continue;
    const existing = byUser.get(row.userId);
    if (existing) {
      existing.unpaidOrders++;
      continue;
    }
    byUser.set(row.userId, {
      userId: row.userId,
      email: row.email,
      name: row.name,
      orderNo: row.orderNo,
      amount: row.amount,
      currency: row.currency,
      plan: row.planName || row.productName,
      orderCreatedAt: row.createdAt,
      unpaidOrders: 1,
      reminderSentAt: null,
      feedbackSentAt: null,
      reply: null,
    });
  }

  const unsubscribed = new Set<string>();
  // Events are newest first, so the first one seen per kind is the latest.
  for (const ev of events) {
    const candidate = ev.userId ? byUser.get(ev.userId) : undefined;
    if (!candidate) continue;
    if (ev.event === RECOVERY_EVENTS.unsubscribe) unsubscribed.add(ev.userId!);
    else if (ev.event === RECOVERY_EVENTS.sent)
      candidate.reminderSentAt ??= ev.createdAt;
    else if (ev.event === RECOVERY_EVENTS.feedbackSent)
      candidate.feedbackSentAt ??= ev.createdAt;
    else if (!candidate.reply) {
      const props = parseProps(ev.props);
      candidate.reply = {
        reason: props.reason || 'other',
        note: props.note || undefined,
        at: ev.createdAt,
      };
    }
  }

  return [...byUser.values()].filter((c) => !unsubscribed.has(c.userId));
}

/** Admin-triggered: emails each picked user once, asking why they didn't pay. */
export async function sendCheckoutFeedbackEmails(
  configs: Record<string, string>,
  userIds: string[]
) {
  const emailCtx = getEmailProvider(configs);
  if (!emailCtx) throw new Error('Email provider is not configured');
  const { appName, siteUrl, logoUrl } = getEmailBrand(configs);
  if (!siteUrl) throw new Error('App URL is not configured');

  const picked = new Set(userIds.slice(0, FEEDBACK_MAX_PER_SEND));
  // Re-check eligibility server-side: never paid, not unsubscribed, not asked.
  const candidates = (await listFeedbackCandidates()).filter(
    (c) => picked.has(c.userId) && !c.feedbackSentAt
  );

  let sent = 0;
  const failed: string[] = [];
  for (const c of candidates) {
    const feedbackToken = encodeURIComponent(
      await signToken(c.userId, c.orderNo, 'feedback')
    );
    const unsubUrl = `${siteUrl}/api/email/recovery?t=${encodeURIComponent(
      await signToken(c.userId, c.orderNo, 'unsub')
    )}`;
    const plan = c.plan || 'your plan';
    const price = formatAmount(c.amount, c.currency);
    const name = c.name?.trim();

    const result = await emailCtx.provider.sendEmail({
      to: c.email,
      subject: `Quick question about your ${appName} checkout`,
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: ['checkout_feedback'],
      react: NoticeEmail({
        appName,
        logoUrl,
        preview: `What stopped you from getting ${plan}? One click helps us a lot.`,
        heading: name
          ? `Hi ${name}, can I ask you something?`
          : 'Can I ask you something?',
        paragraphs: [
          `You started checking out ${plan} (${price}) on ${appName} but didn't finish. No pressure at all — I'd just love to know what got in the way, so we can fix it.`,
          'Pick whatever fits best (one click), or simply reply to this email:',
        ],
        options: feedbackOptions(siteUrl, feedbackToken),
        footer: `You're receiving this because you started a checkout at ${appName}.`,
        unsubscribeUrl: unsubUrl,
      }),
    });
    if (!result.success) {
      console.error('[checkout-feedback] send failed:', result.error);
      failed.push(c.email);
      continue;
    }
    await logEvent(RECOVERY_EVENTS.feedbackSent, c.userId, {
      order_no: c.orderNo,
      ...(result.messageId && { message_id: result.messageId }),
    });
    sent++;
  }
  return { sent, skipped: picked.size - candidates.length, failed };
}

export async function recordCheckoutFeedback(
  userId: string,
  orderNo: string,
  reason: FeedbackReason,
  note: string
) {
  await logEvent(RECOVERY_EVENTS.feedbackReply, userId, {
    order_no: orderNo,
    reason,
    note: note.trim().slice(0, 1000) || undefined,
  });
}
