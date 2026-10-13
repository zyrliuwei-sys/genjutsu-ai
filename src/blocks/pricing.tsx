'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Film,
  Infinity as InfinityIcon,
  MonitorPlay,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { GENJUTSU_CREDITS, genjutsuCredits } from '@/config/genjutsu';
import { pricingCatalog, type PricingProduct } from '@/config/pricing';
import { apiGet, apiPost } from '@/lib/api-client';
import { currentPathWithQuery } from '@/lib/redirect';
import { track } from '@/lib/track';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  PaymentProviderModal,
  PaymentProviderOptions,
  type PaymentProvider,
} from '@/components/payment-provider-modal';
import {
  PricingTable,
  type PricingGroup,
  type PricingPlan,
} from '@/components/pricing-table';

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

const ALL_PROVIDERS: PaymentProvider[] = [
  'stripe',
  'creem',
  'paypal',
  'alipay',
  'wechat',
  'waffo',
];

export function Pricing({
  title,
  variant = 'section',
  headingAs: Heading = 'h2',
  beforeCheckout,
  clipSeconds,
  balanceCredits = 0,
  singleVideo,
}: {
  title?: string;
  /** `h1` when the block is the page's main content (the /pricing route). */
  headingAs?: 'h1' | 'h2';
  /** `dialog` drops the page-section chrome for use inside a modal. */
  variant?: 'section' | 'dialog';
  beforeCheckout?: () => Promise<unknown>;
  clipSeconds?: number;
  balanceCredits?: number;
  singleVideo?: PricingProduct;
} = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  // Shares the generators' cache; signed-out visitors are first-time buyers.
  const creditsQuery = useQuery({
    queryKey: ['credits'],
    queryFn: () =>
      apiGet<{ balance: number; hasPaidOrder: boolean }>('/api/credits'),
    enabled: Boolean(session?.user),
  });
  const firstOrder =
    !session?.user || creditsQuery.data?.hasPaidOrder === false;

  const { data: configsData, refetch: refetchConfigs } = usePublicConfig();
  const configs = configsData ?? {};
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PricingPlan | null>(null);
  const [loadingProvider, setLoadingProvider] =
    useState<PaymentProvider | null>(null);
  const dialog = variant === 'dialog';

  const enabledProviders = useMemo<PaymentProvider[]>(
    () => ALL_PROVIDERS.filter((p) => configs[`${p}_enabled`] === 'true'),
    [configs]
  );

  // One shared prepaid balance for every generation API.
  const clipCost =
    singleVideo?.credits ?? (clipSeconds ? genjutsuCredits(clipSeconds) : 0);
  // "3 videos · $8.30 each · 10s" — packs are sized in whole 10s videos.
  function packVideos(productId?: string) {
    const product = productId ? pricingCatalog[productId] : undefined;
    if (!product) return '';
    const count = Math.floor(product.credits / GENJUTSU_CREDITS);
    const price = usd(Math.round(product.priceInCents / count));
    return count === 1
      ? m['landing.pricing.pack_one_video']({ price })
      : m['landing.pricing.pack_videos']({ count, price });
  }

  function plan(
    productId: string,
    name: string,
    featured = false
  ): PricingPlan {
    const product = pricingCatalog[productId];
    const coversClip = product.credits + balanceCredits >= clipCost;
    return {
      id: productId,
      productId,
      name,
      featured,
      // Packs are sized in whole 10s Genjutsu videos; the text-to-video
      // paywall keeps its own per-clip count.
      description: singleVideo
        ? m['landing.text_video.pack_count']({
            count: Math.floor(product.credits / clipCost),
          })
        : undefined,
      price: usd(product.priceInCents),
      priceInCents: product.priceInCents,
      currency: product.currency,
      credits: product.credits,
      features: [
        ...(singleVideo ? [] : [{ icon: Video, label: packVideos(productId) }]),
        // Phones show only the video count; the rest is desktop-only.
        {
          icon: Film,
          label: m['landing.pricing.shared_modes'](),
          hideOnMobile: true,
        },
        {
          icon: MonitorPlay,
          label: m['landing.pricing.variable_cost'](),
          hideOnMobile: true,
        },
        {
          icon: InfinityIcon,
          label: m['landing.pricing.feature_no_subscription'](),
          hideOnMobile: true,
        },
        ...(!coversClip
          ? [{ label: m['landing.pricing.insufficient_selected_clip']() }]
          : []),
      ],
      // A large clip may need multiple top-ups; keep purchase options available.
      disabled: false,
      buttonText: m['landing.pricing.buy_now'](),
    };
  }
  const groups: PricingGroup[] = [
    {
      key: 'one-time',
      label: m['landing.pricing.one_time'](),
      plans: [
        firstOrder
          ? {
              ...plan('pack_first', m['landing.pricing.pack_first']()),
              originalPrice: usd(pricingCatalog.pack_starter.priceInCents),
              badge: m['landing.pricing.first_order_badge'](),
            }
          : plan('pack_starter', m['landing.pricing.pack_starter']()),
        plan('pack_plus', m['landing.pricing.pack_plus'](), true),
        plan('pack_pro', m['landing.pricing.pack_pro']()),
      ],
    },
  ];

  const checkoutMutation = useMutation({
    mutationFn: ({
      plan,
      provider,
    }: {
      plan: PricingPlan;
      provider?: PaymentProvider;
    }) =>
      apiPost<{ checkout_url?: string }>('/api/payment/checkout', {
        product_id: plan.productId,
        product_name: plan.productName || plan.name,
        plan_name: plan.plan?.name || plan.name,
        price: plan.priceInCents,
        currency: plan.currency || 'usd',
        type: plan.plan ? 'subscription' : 'one-time',
        description: plan.name,
        plan: plan.plan,
        credits: plan.credits,
        credits_valid_days: plan.creditsValidDays,
        payment_provider: provider,
        // Come back to the page the user paid from.
        redirect: currentPathWithQuery('/settings/billing'),
      }),
    onSuccess: (data) => {
      if (!data?.checkout_url) {
        toast.error('Checkout failed');
        setLoadingProvider(null);
        return;
      }
      track('checkout_redirect');
      window.location.href = data.checkout_url;
    },
    onError: (err: any) => {
      track('checkout_failed', { error: String(err?.message || '') });
      toast.error(err?.message || 'Checkout failed');
      setLoadingProvider(null);
    },
  });

  async function startCheckout(plan: PricingPlan, provider?: PaymentProvider) {
    // Repeat clicks while a checkout is in flight would create duplicate orders.
    if (checkoutMutation.isPending || loadingProvider) return;
    try {
      await beforeCheckout?.();
    } catch {
      toast.error('Could not save media for your return');
      return;
    }
    setLoadingProvider(provider ?? null);
    checkoutMutation.mutate({ plan, provider });
  }

  async function handleCheckout(plan: PricingPlan) {
    track('plan_click', {
      plan: plan.productId || '',
      signedIn: Boolean(session?.user),
    });
    if (!session?.user) {
      const callbackUrl = encodeURIComponent(currentPathWithQuery('/pricing'));
      router.push(`/sign-in?callbackUrl=${callbackUrl}`);
      return;
    }

    // A click can land before public config has loaded — fetch it first
    // instead of guessing a provider that may not be configured.
    const cfg = configsData ?? (await refetchConfigs()).data ?? {};
    const enabled = ALL_PROVIDERS.filter((p) => cfg[`${p}_enabled`] === 'true');
    const selectEnabled = cfg.select_payment_enabled === 'true';
    // Unknown → omit it; the server falls back to the admin default provider.
    const defaultProvider = (cfg.default_payment_provider || enabled[0]) as
      | PaymentProvider
      | undefined;

    if (selectEnabled && enabled.length > 1) {
      track('provider_modal_shown', { plan: plan.productId || '' });
      setPendingPlan(plan);
      // Inside the paywall dialog the picker replaces the plans in place —
      // a second stacked dialog is easy to lose.
      if (!dialog) setModalOpen(true);
      return;
    }

    await startCheckout(plan, defaultProvider);
  }

  function handleProviderSelect(provider: PaymentProvider) {
    if (!pendingPlan) return;
    track('provider_selected', {
      plan: pendingPlan.productId || '',
      provider,
    });
    startCheckout(pendingPlan, provider);
  }
  const Wrapper = dialog ? 'div' : 'section';

  return (
    <Wrapper
      id={dialog ? undefined : 'pricing'}
      className={
        dialog ? undefined : 'border-border border-t px-4 py-24 sm:py-32'
      }
    >
      <div className="mx-auto max-w-6xl">
        <div className={dialog ? 'mb-6 px-8 text-center' : 'mb-20 text-center'}>
          <Heading
            className={
              dialog
                ? 'eg-heading text-2xl sm:text-3xl'
                : 'eg-heading text-4xl sm:text-5xl'
            }
          >
            {title ?? m['landing.pricing.title']()}
          </Heading>
          <p
            className={cn(
              'text-muted-foreground',
              dialog ? 'mt-2 text-sm' : 'mt-5'
            )}
          >
            <span className={dialog ? undefined : 'max-md:hidden'}>
              {m['landing.pricing.description']()}
            </span>
            {!dialog && (
              <span className="md:hidden">
                {m['landing.pricing.description_short']()}
              </span>
            )}
          </p>
          {/* The paywall keeps one line; billing details live on /pricing. */}
          {!dialog && (
            <>
              <p className="text-muted-foreground mt-2 text-sm max-md:hidden">
                {singleVideo
                  ? `${singleVideo.productName}. ${m['landing.text_video.audio']()}`
                  : m['landing.pricing.billing_rules']()}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                <span className="max-md:hidden">
                  {m['landing.pricing.failure_policy']()}
                </span>
                <span className="md:hidden">
                  {m['landing.pricing.failure_policy_short']()}
                </span>
              </p>
            </>
          )}
          {!dialog && (
            <p className="text-primary mt-4 text-sm max-md:hidden">
              <Link href="/create">{m['landing.pricing.text_entry']()}</Link>
            </p>
          )}
        </div>
        {dialog && pendingPlan ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border-primary/60 bg-primary/5 flex flex-col rounded-2xl border p-5">
              <p className="text-muted-foreground text-sm">
                {pendingPlan.name}
              </p>
              <p className="mt-1 text-4xl font-semibold tracking-tight">
                {pendingPlan.price}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                {packVideos(pendingPlan.productId) || pendingPlan.description}
              </p>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground mt-auto inline-flex items-center gap-1 self-start pt-6 text-sm disabled:opacity-50"
                disabled={!!loadingProvider}
                onClick={() => setPendingPlan(null)}
              >
                <ArrowLeft className="size-4" />
                {m['common.pricing.back_to_plans']()}
              </button>
            </div>
            <div className="flex flex-col justify-center">
              <p className="mb-3 font-medium">
                {m['common.pricing.choose_payment']()}
              </p>
              <PaymentProviderOptions
                providers={enabledProviders}
                loadingProvider={loadingProvider}
                onSelect={handleProviderSelect}
              />
            </div>
          </div>
        ) : (
          <PricingTable groups={groups} onCheckout={handleCheckout} />
        )}
      </div>

      <PaymentProviderModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setPendingPlan(null);
            setLoadingProvider(null);
          }
        }}
        providers={enabledProviders.length ? enabledProviders : ['stripe']}
        loadingProvider={loadingProvider}
        onSelect={handleProviderSelect}
        planName={pendingPlan?.name}
        price={pendingPlan?.price}
      />
    </Wrapper>
  );
}
