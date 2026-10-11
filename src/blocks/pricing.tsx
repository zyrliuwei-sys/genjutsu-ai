'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Film, Infinity as InfinityIcon, MonitorPlay } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { genjutsuCredits } from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import { apiPost } from '@/lib/api-client';
import { currentPathWithQuery } from '@/lib/redirect';
import { m } from '@/paraglide/messages.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  PaymentProviderModal,
  type PaymentProvider,
} from '@/components/payment-provider-modal';
import {
  PricingTable,
  type PricingFeature,
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
}: {
  title?: string;
  /** `h1` when the block is the page's main content (the /pricing route). */
  headingAs?: 'h1' | 'h2';
  /** `dialog` drops the page-section chrome for use inside a modal. */
  variant?: 'section' | 'dialog';
  beforeCheckout?: () => Promise<unknown>;
  clipSeconds?: number;
  balanceCredits?: number;
} = {}) {
  const router = useRouter();
  const { data: session } = useSession();

  const { data: configsData, refetch: refetchConfigs } = usePublicConfig();
  const configs = configsData ?? {};
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PricingPlan | null>(null);
  const [loadingProvider, setLoadingProvider] =
    useState<PaymentProvider | null>(null);

  const enabledProviders = useMemo<PaymentProvider[]>(
    () => ALL_PROVIDERS.filter((p) => configs[`${p}_enabled`] === 'true'),
    [configs]
  );

  // Reference prices — the same math the generate API charges with.
  const perVideo = genjutsuCredits(5);
  const perLongVideo = genjutsuCredits(10);
  const clipCost = clipSeconds ? genjutsuCredits(clipSeconds) : perVideo;

  function durationSummary(credits: number) {
    const shortCount = Math.floor(credits / perVideo);
    const longCount = Math.floor(credits / perLongVideo);
    return longCount > 0
      ? m['landing.pricing.duration_options']({ shortCount, longCount })
      : m['landing.pricing.feature_videos']({ count: shortCount });
  }

  function features(credits: number): PricingFeature[] {
    return [
      {
        icon: Film,
        label: durationSummary(credits),
      },
      { icon: MonitorPlay, label: m['landing.pricing.feature_hd']() },
      {
        icon: InfinityIcon,
        label: m['landing.pricing.feature_no_subscription'](),
      },
    ];
  }

  // Display data comes from the same catalog the checkout API trusts.
  function plan(
    productId: string,
    opts: { name: string; featured?: boolean; badge?: string }
  ): PricingPlan {
    const product = pricingCatalog[productId];
    const videos = Math.floor(product.credits / clipCost);
    const coversClip = product.credits + balanceCredits >= clipCost;
    return {
      id: productId,
      name: opts.name,
      description: clipSeconds
        ? m['landing.pricing.selected_duration_count']({
            count: videos,
            seconds: clipSeconds > 5 ? 10 : 5,
          })
        : durationSummary(product.credits),
      price: usd(product.priceInCents),
      featured: opts.featured,
      badge: opts.badge,
      features: [
        ...features(product.credits),
        {
          icon: Film,
          label: m['landing.pricing.unit_value']({
            seconds: 5,
            price: usd(
              product.priceInCents / Math.floor(product.credits / perVideo)
            ),
          }),
        },
        ...(product.credits >= perLongVideo
          ? [
              {
                icon: Film,
                label: m['landing.pricing.unit_value']({
                  seconds: 10,
                  price: usd(
                    product.priceInCents /
                      Math.floor(product.credits / perLongVideo)
                  ),
                }),
              },
            ]
          : []),
        ...(!coversClip
          ? [{ label: m['landing.pricing.insufficient_selected_clip']() }]
          : []),
      ],
      disabled: !coversClip,
      productId,
      priceInCents: product.priceInCents,
      currency: product.currency,
      credits: product.credits,
      buttonText: coversClip
        ? m['landing.pricing.buy_now']()
        : m['landing.pricing.insufficient_selected_clip'](),
    };
  }

  const groups: PricingGroup[] = [
    {
      key: 'one-time',
      label: m['landing.pricing.one_time'](),
      plans: [
        plan('pack_starter', { name: m['landing.pricing.pack_starter']() }),
        plan('pack_creator', {
          name: m['landing.pricing.pack_creator'](),
          featured: true,
          badge: m['landing.pricing.popular'](),
        }),
        plan('pack_pro', { name: m['landing.pricing.pack_pro']() }),
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
      window.location.href = data.checkout_url;
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Checkout failed');
      setLoadingProvider(null);
    },
  });

  async function startCheckout(plan: PricingPlan, provider?: PaymentProvider) {
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
      setPendingPlan(plan);
      setModalOpen(true);
      return;
    }

    await startCheckout(plan, defaultProvider);
  }

  function handleProviderSelect(provider: PaymentProvider) {
    if (!pendingPlan) return;
    startCheckout(pendingPlan, provider);
  }

  const dialog = variant === 'dialog';
  const Wrapper = dialog ? 'div' : 'section';

  return (
    <Wrapper
      id={dialog ? undefined : 'pricing'}
      className={
        dialog ? undefined : 'border-border border-t px-4 py-24 sm:py-32'
      }
    >
      <div className="mx-auto max-w-6xl">
        <div className={dialog ? 'mb-8 pr-8 text-center' : 'mb-20 text-center'}>
          <Heading
            className={
              dialog
                ? 'eg-heading text-2xl sm:text-3xl'
                : 'eg-heading text-4xl sm:text-5xl'
            }
          >
            {title ?? m['landing.pricing.title']()}
          </Heading>
          <p className="text-muted-foreground mt-5">
            {m['landing.pricing.description']()}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            {m['landing.pricing.per_video']()}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            {m['landing.pricing.failure_policy']()}
          </p>
        </div>
        <PricingTable groups={groups} onCheckout={handleCheckout} />
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
