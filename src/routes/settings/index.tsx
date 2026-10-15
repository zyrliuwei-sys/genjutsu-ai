import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Coins, TrendingUp, Video } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { GENJUTSU_CREDITS } from '@/config/genjutsu';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Subscription = {
  status: string;
  planName?: string | null;
  productName?: string | null;
};

function DashboardPage() {
  const { data: session } = useSession();

  const { data: creditsData } = useQuery({
    queryKey: ['user-credits'],
    queryFn: () => apiGet<{ balance: number }>('/api/credits'),
  });
  const { data: subscriptionData } = useQuery({
    queryKey: ['user-subscription-current'],
    queryFn: () =>
      apiGet<Subscription | null>('/api/user/subscriptions/current'),
  });

  const credits = creditsData?.balance ?? null;
  // Packs are one-time balance; only legacy subscribers have a plan.
  const subscription = subscriptionData ?? null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {m['settings.title']()}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {m['settings.welcome']({
            name: session?.user?.name || session?.user?.email || '',
          })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {m['settings.credits.balance']()}
            </CardTitle>
            <Coins className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{credits ?? '—'}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {credits === null
                ? m['settings.credits.description']()
                : m['settings.overview.balance_hint']({
                    count: Math.floor(credits / GENJUTSU_CREDITS),
                  })}
            </p>
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'mt-4'
              )}
            >
              {m['settings.credits.purchase']()}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {m['settings.videos.title']()}
            </CardTitle>
            <Video className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {m['settings.overview.videos_description']()}
            </p>
            <Link
              href="/settings/videos"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'mt-4'
              )}
            >
              {m['settings.overview.open_videos']()}
            </Link>
          </CardContent>
        </Card>

        {subscription && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {m['settings.overview.plan']()}
              </CardTitle>
              <TrendingUp className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscription.planName || subscription.productName}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {m['settings.overview.plan_description']()}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/settings/')({
  component: DashboardPage,
});
