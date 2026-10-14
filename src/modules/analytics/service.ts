import { sql, type SQL } from 'drizzle-orm';

import { db } from '@/core/db';

/**
 * Operations analytics over `funnel_event` + `user` + `order`.
 *
 * Counting rules (shown as the dashboard footnote):
 * - Every step counts unique visitors (anon_id), never raw event counts.
 * - A visitor's source / country / version is taken from their FIRST event
 *   in the window; a paying user is attributed to the first visitor id they
 *   were seen signed in with.
 * - The team's test accounts (and every visitor id they used) and local dev
 *   events (`v` = 'dev') are excluded.
 * - Days are Beijing time (UTC+8); "today" is compared with yesterday up to
 *   the same clock time.
 */

const DAY_MS = 86_400_000;
const TZ_OFFSET_MS = 8 * 3_600_000;

// Admin / test accounts — keep in sync with the team's test-account list.
const TEST_USER_IDS = [
  '2c7c1e56-8a10-4916-ae8a-fa6a6dd7269d',
  'a45fdcb7-8ce6-4d39-aa5d-faccfec9b263',
];
const testUsers = sql.raw(TEST_USER_IDS.map((id) => `'${id}'`).join(','));

// Some early rows hold props truncated mid-JSON; json_extract would throw.
const prop = (key: string) =>
  sql.raw(
    `coalesce(json_extract(case when json_valid(props) then props end, '$.${key}'), '')`
  );

function eventFilter(start: number, end: number): SQL {
  return sql`created_at >= ${start} and created_at < ${end}
    and ${prop('v')} <> 'dev'
    and coalesce(user_id, '') not in (${testUsers})
    and anon_id not in (select anon_id from funnel_event where user_id in (${testUsers}))`;
}

// Waffo reports paid_at truncated to the UTC day (sometimes before the order
// was even created); fall back to updated_at, when the webhook landed.
const PAID_TIME =
  'case when paid_at < created_at then updated_at else paid_at end';
const paidTime = sql.raw(PAID_TIME);

function paidFilter(start: number, end: number): SQL {
  return sql`status = 'paid' and ${paidTime} >= ${start} and ${paidTime} < ${end}
    and user_id not in (${testUsers})`;
}

// `values()` returns positional rows on both the D1 binding and the D1 HTTP
// proxy used in local dev (`all()` differs: objects vs arrays).
async function rows<K extends string>(
  keys: readonly K[],
  query: SQL
): Promise<Record<K, any>[]> {
  const result: unknown[][] = await db().values(query);
  return result.map((row) =>
    Object.fromEntries(keys.map((k, i) => [k, row[i] ?? 0]))
  ) as Record<K, any>[];
}

export function beijingDayStart(ts: number) {
  return Math.floor((ts + TZ_OFFSET_MS) / DAY_MS) * DAY_MS - TZ_OFFSET_MS;
}

const SNAPSHOT_KEYS = [
  'visitors',
  'paywall',
  'checkout',
  'signups',
  'payers',
  'orders',
  'revenue',
] as const;
export type Snapshot = Record<(typeof SNAPSHOT_KEYS)[number], number>;

async function snapshot(start: number, end: number): Promise<Snapshot> {
  const ev = eventFilter(start, end);
  const paid = paidFilter(start, end);
  const [row] = await rows(
    SNAPSHOT_KEYS,
    sql`select
      (select count(distinct anon_id) from funnel_event where ${ev}),
      (select count(distinct anon_id) from funnel_event where event = 'paywall_shown' and ${ev}),
      (select count(distinct anon_id) from funnel_event where event = 'checkout_redirect' and ${ev}),
      (select count(*) from "user" where created_at >= ${start} and created_at < ${end} and id not in (${testUsers})),
      (select count(distinct user_id) from "order" where ${paid}),
      (select count(*) from "order" where ${paid}),
      (select coalesce(sum(amount), 0) from "order" where ${paid})`
  );
  return row as Snapshot;
}

const dayKey = (column: string) =>
  sql.raw(`(${column} + ${TZ_OFFSET_MS}) / ${DAY_MS}`);

export type DailyRow = Snapshot & { day: string };

async function daily(start: number, end: number): Promise<DailyRow[]> {
  const [events, users, orders] = await Promise.all([
    rows(
      ['day', 'visitors', 'paywall', 'checkout'] as const,
      sql`select ${dayKey('created_at')} d, count(distinct anon_id),
        count(distinct case when event = 'paywall_shown' then anon_id end),
        count(distinct case when event = 'checkout_redirect' then anon_id end)
      from funnel_event where ${eventFilter(start, end)} group by d`
    ),
    rows(
      ['day', 'signups'] as const,
      sql`select ${dayKey('created_at')} d, count(*) from "user"
      where created_at >= ${start} and created_at < ${end} and id not in (${testUsers})
      group by d`
    ),
    rows(
      ['day', 'payers', 'orders', 'revenue'] as const,
      sql`select ${dayKey(PAID_TIME)} d, count(distinct user_id), count(*), coalesce(sum(amount), 0)
      from "order" where ${paidFilter(start, end)} group by d`
    ),
  ]);

  const byDay = new Map<number, DailyRow>();
  const firstDay = Math.floor((start + TZ_OFFSET_MS) / DAY_MS);
  const lastDay = Math.floor((end - 1 + TZ_OFFSET_MS) / DAY_MS);
  for (let d = lastDay; d >= firstDay; d--) {
    byDay.set(d, {
      day: new Date(d * DAY_MS).toISOString().slice(0, 10),
      visitors: 0,
      paywall: 0,
      checkout: 0,
      signups: 0,
      payers: 0,
      orders: 0,
      revenue: 0,
    });
  }
  for (const r of [...events, ...users, ...orders]) {
    const row = byDay.get(Number(r.day));
    if (row) Object.assign(row, { ...r, day: row.day });
  }
  return [...byDay.values()];
}

export const BREAKDOWN_DIMENSIONS = ['src', 'country', 'v'] as const;
export type BreakdownDimension = (typeof BREAKDOWN_DIMENSIONS)[number];

const BREAKDOWN_KEYS = [
  'key',
  'visitors',
  'uploaded',
  'generated',
  'signedIn',
  'paywall',
  'plan',
  'checkout',
  'payers',
  'orders',
  'revenue',
] as const;
export type BreakdownRow = Record<(typeof BREAKDOWN_KEYS)[number], number> & {
  key: string;
};

/** Step-by-step funnel (unique visitors) split by first-touch dimension. */
async function breakdown(
  dimension: BreakdownDimension,
  start: number,
  end: number
): Promise<BreakdownRow[]> {
  const dim = prop(dimension);
  return (await rows(
    BREAKDOWN_KEYS,
    sql`with ev as (
      select anon_id, user_id, event, created_at, ${dim} k
      from funnel_event where ${eventFilter(start, end)}
    ),
    first as (
      select anon_id, k from (
        select anon_id, k, row_number() over (partition by anon_id order by created_at) rn from ev
      ) where rn = 1
    ),
    steps as (
      select anon_id,
        max(event = 'lead_uploaded') uploaded,
        max(event = 'generate_click') generated,
        max(user_id is not null) signed_in,
        max(event = 'paywall_shown') paywall,
        max(event = 'plan_click') plan,
        max(event = 'checkout_redirect') checkout
      from ev group by anon_id
    ),
    user_anon as (
      select user_id, anon_id from (
        select user_id, anon_id, row_number() over (partition by user_id order by created_at) rn
        from ev where user_id is not null
      ) where rn = 1
    ),
    user_rev as (
      select user_id, count(*) orders, sum(amount) revenue
      from "order" where ${paidFilter(start, end)} group by user_id
    )
    select f.k, count(*), sum(s.uploaded), sum(s.generated), sum(s.signed_in),
      sum(s.paywall), sum(s.plan), sum(s.checkout),
      count(r.user_id), coalesce(sum(r.orders), 0), coalesce(sum(r.revenue), 0)
    from first f
    join steps s on s.anon_id = f.anon_id
    left join user_anon ua on ua.anon_id = f.anon_id
    left join user_rev r on r.user_id = ua.user_id
    group by f.k order by count(*) desc limit 30`
  )) as BreakdownRow[];
}

export async function getAnalyticsOverview(days: number) {
  const now = Date.now();
  const todayStart = beijingDayStart(now);
  const rangeStart = now - days * DAY_MS;

  const [today, yesterday, dailyRows, bySrc, byCountry, byVersion, last] =
    await Promise.all([
      snapshot(todayStart, now),
      snapshot(todayStart - DAY_MS, now - DAY_MS),
      daily(todayStart - 13 * DAY_MS, now),
      breakdown('src', rangeStart, now),
      breakdown('country', rangeStart, now),
      breakdown('v', rangeStart, now),
      rows(
        ['paidAt'] as const,
        sql`select max(${paidTime}) from "order" where status = 'paid' and user_id not in (${testUsers})`
      ),
    ]);

  return {
    now,
    days,
    today,
    yesterday,
    daily: dailyRows,
    breakdown: { src: bySrc, country: byCountry, v: byVersion },
    lastPaidAt: Number(last[0]?.paidAt) || null,
  };
}

export type AnalyticsOverview = Awaited<
  ReturnType<typeof getAnalyticsOverview>
>;
