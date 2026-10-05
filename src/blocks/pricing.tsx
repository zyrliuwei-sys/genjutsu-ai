'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Film,
  Image as ImageIcon,
  Infinity as InfinityIcon,
  MonitorPlay,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { pricingCatalog } from '@/config/pricing';
import { getStudioModel, studioCredits } from '@/config/studio-models';
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
];

export function Pricing({
  title,
  variant = 'section',
  headingAs: Heading = 'h2',
}: {
  title?: string;
  /** `h1` when the block is the page's main content (the /pricing route). */
  headingAs?: 'h1' | 'h2';
  /** `dialog` drops the page-section chrome for use inside a modal. */
  variant?: 'section' | 'dialog';
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
  const clip = { aspect: '9:16', duration: 5 } as const;
  const perVideo = studioCredits(getStudioModel('seedance-2')!, {
    ...clip,
    resolution: '720p',
  });
  const perFastVideo = studioCredits(getStudioModel('seedance-2-fast')!, {
    ...clip,
    resolution: '480p',
  });
  const perImage = studioCredits(getStudioModel('gpt-image-2')!, {
    ...clip,
    resolution: '720p',
  });

  function features(credits: number): PricingFeature[] {
    return [
      {
        icon: Sparkles,
        label: m['landing.pricing.feature_credits']({
          credits: credits.toLocaleString('en-US'),
        }),
      },
      {
        icon: Film,
        label: m['landing.pricing.feature_videos']({
          count: Math.floor(credits / perVideo),
        }),
      },
      {
        icon: Zap,
        label: m['landing.pricing.feature_fast_videos']({
          count: Math.floor(credits / perFastVideo),
        }),
      },
      {
        icon: ImageIcon,
        label: m['landing.pricing.feature_images']({
          count: Math.floor(credits / perImage),
        }),
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
    return {
      id: productId,
      name: opts.name,
      description: m['landing.pricing.pack_desc'](),
      price: usd(product.priceInCents),
      featured: opts.featured,
      badge: opts.badge,
      features: features(product.credits),
      productId,
      priceInCents: product.priceInCents,
      currency: product.currency,
      credits: product.credits,
      buttonText: m['landing.pricing.buy_now'](),
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
        plan('pack_studio', {
          name: m['landing.pricing.pack_studio'](),
          badge: m['landing.pricing.best_value'](),
        }),
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

  function startCheckout(plan: PricingPlan, provider?: PaymentProvider) {
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
            {m['landing.pricing.per_video']({
              credits: perVideo.toLocaleString('en-US'),
              fast: perFastVideo.toLocaleString('en-US'),
              image: perImage.toLocaleString('en-US'),
            })}
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
