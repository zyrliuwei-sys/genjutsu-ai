import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import type {
  AnalyticsOverview,
  BreakdownDimension,
  BreakdownRow,
  Snapshot,
} from '@/modules/analytics/service';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const RANGES = [1, 7, 30];

// Hours without a payment after which the "last payment" line turns red.
const NO_PAYMENT_ALERT_HOURS = 6;

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function pct(part: number, whole: number) {
  return whole ? `${((part / whole) * 100).toFixed(1)}%` : '–';
}

function SnapshotCard({
  label,
  today,
  yesterday,
  format = String,
}: {
  label: string;
  today: number;
  yesterday: number;
  format?: (n: number) => string;
}) {
  const delta = yesterday ? (today - yesterday) / yesterday : null;
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{format(today)}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-xs">
        {m['admin.analytics.yesterday']({ value: format(yesterday) })}
        {delta !== null && (
          <span
            className={cn(
              'ml-2 font-medium',
              delta >= 0 ? 'text-emerald-500' : 'text-red-500'
            )}
          >
            {delta >= 0 ? '+' : ''}
            {(delta * 100).toFixed(0)}%
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownTable({
  rows,
  dimension,
}: {
  rows: BreakdownRow[];
  dimension: BreakdownDimension;
}) {
  const steps = [
    ['visitors', m['admin.analytics.visitors']()],
    ['uploaded', m['admin.analytics.uploaded']()],
    ['generated', m['admin.analytics.generated']()],
    ['signedIn', m['admin.analytics.signed_in']()],
    ['paywall', m['admin.analytics.paywall']()],
    ['plan', m['admin.analytics.plan']()],
    ['checkout', m['admin.analytics.checkout']()],
    ['payers', m['admin.analytics.payers']()],
  ] as const;
  const label = {
    src: m['admin.analytics.by_src'](),
    country: m['admin.analytics.by_country'](),
    v: m['admin.analytics.by_version'](),
  }[dimension];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{label}</TableHead>
          {steps.map(([key, title]) => (
            <TableHead key={key} className="text-right">
              {title}
            </TableHead>
          ))}
          <TableHead className="text-right">
            {m['admin.analytics.revenue']()}
          </TableHead>
          <TableHead className="text-right">
            {m['admin.analytics.rev_per_visitor']()}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="max-w-56 truncate font-medium">
              {row.key || m['admin.analytics.unknown']()}
            </TableCell>
            {steps.map(([key]) => (
              <TableCell key={key} className="text-right tabular-nums">
                {row[key]}
                {key !== 'visitors' && (
                  <span className="text-muted-foreground ml-1 text-xs">
                    {pct(row[key], row.visitors)}
                  </span>
                )}
              </TableCell>
            ))}
            <TableCell className="text-right tabular-nums">
              {usd(row.revenue)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {usd(row.visitors ? row.revenue / row.visitors : 0)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const [dimension, setDimension] = useState<BreakdownDimension>('src');

  const query = useQuery({
    queryKey: ['admin-analytics', days],
    queryFn: () =>
      apiGet<AnalyticsOverview>(`/api/admin/analytics?days=${days}`),
    placeholderData: keepPreviousData,
    refetchInterval: 5 * 60_000,
  });
  const data = query.data;

  const cards: {
    key: keyof Snapshot;
    label: string;
    format?: (n: number) => string;
  }[] = [
    { key: 'revenue', label: m['admin.analytics.revenue'](), format: usd },
    { key: 'payers', label: m['admin.analytics.payers']() },
    { key: 'orders', label: m['admin.analytics.orders']() },
    { key: 'visitors', label: m['admin.analytics.visitors']() },
    { key: 'signups', label: m['admin.analytics.signups']() },
    { key: 'paywall', label: m['admin.analytics.paywall']() },
    { key: 'checkout', label: m['admin.analytics.checkout']() },
  ];

  const hoursSincePaid = data?.lastPaidAt
    ? Math.floor((data.now - data.lastPaidAt) / 3_600_000)
    : null;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{m['admin.analytics.title']()}</h1>
        <p className="text-muted-foreground">
          {m['admin.analytics.description']()}
        </p>
      </div>

      {query.error && (
        <p className="text-destructive text-sm">{query.error.message}</p>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">
            {m['admin.analytics.today_vs_yesterday']()}
          </h2>
          {data && (
            <span
              className={cn(
                'text-sm',
                hoursSincePaid === null ||
                  hoursSincePaid >= NO_PAYMENT_ALERT_HOURS
                  ? 'text-red-500'
                  : 'text-muted-foreground'
              )}
            >
              {hoursSincePaid === null
                ? m['admin.analytics.no_payment']()
                : m['admin.analytics.last_paid']({ hours: hoursSincePaid })}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {cards.map((card) => (
            <SnapshotCard
              key={card.key}
              label={card.label}
              today={data?.today[card.key] ?? 0}
              yesterday={data?.yesterday[card.key] ?? 0}
              format={card.format}
            />
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{m['admin.analytics.daily']()}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m['admin.analytics.day']()}</TableHead>
                <TableHead className="text-right">
                  {m['admin.analytics.visitors']()}
                </TableHead>
                <TableHead className="text-right">
                  {m['admin.analytics.signups']()}
                </TableHead>
                <TableHead className="text-right">
                  {m['admin.analytics.paywall']()}
                </TableHead>
                <TableHead className="text-right">
                  {m['admin.analytics.checkout']()}
                </TableHead>
                <TableHead className="text-right">
                  {m['admin.analytics.payers']()}
                </TableHead>
                <TableHead className="text-right">
                  {m['admin.analytics.orders']()}
                </TableHead>
                <TableHead className="text-right">
                  {m['admin.analytics.revenue']()}
                </TableHead>
                <TableHead className="text-right">
                  {m['admin.analytics.visit_to_signup']()}
                </TableHead>
                <TableHead className="text-right">
                  {m['admin.analytics.visit_to_paid']()}
                </TableHead>
                <TableHead className="text-right">
                  {m['admin.analytics.signup_to_paid']()}
                </TableHead>
                <TableHead className="text-right">
                  {m['admin.analytics.rev_per_visitor']()}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.daily.map((row) => (
                <TableRow key={row.day}>
                  <TableCell className="font-medium">{row.day}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.visitors}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.signups}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.paywall}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.checkout}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.payers}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.orders}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {usd(row.revenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pct(row.signups, row.visitors)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pct(row.payers, row.visitors)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pct(row.payers, row.signups)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {usd(row.visitors ? row.revenue / row.visitors : 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{m['admin.analytics.funnel']()}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              value={dimension}
              onValueChange={(value) =>
                setDimension(value as BreakdownDimension)
              }
            >
              <TabsList>
                <TabsTrigger value="src">
                  {m['admin.analytics.by_src']()}
                </TabsTrigger>
                <TabsTrigger value="country">
                  {m['admin.analytics.by_country']()}
                </TabsTrigger>
                <TabsTrigger value="v">
                  {m['admin.analytics.by_version']()}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {RANGES.map((range) => (
              <Button
                key={range}
                size="sm"
                variant={range === days ? 'default' : 'outline'}
                onClick={() => setDays(range)}
              >
                {m['admin.analytics.range']({ days: range })}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent
          className={cn(
            'overflow-x-auto transition-opacity',
            query.isFetching && 'opacity-60'
          )}
        >
          <BreakdownTable
            rows={data?.breakdown[dimension] ?? []}
            dimension={dimension}
          />
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs leading-relaxed">
        {m['admin.analytics.footnote']()}
      </p>
    </div>
  );
}

export const Route = createFileRoute('/admin/analytics')({
  component: AnalyticsPage,
});
