'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Film, Infinity as InfinityIcon, MonitorPlay } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { genjutsuCredits } from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import { apiPost } from '@/lib/api-client';
import type { FunnelProperties } from '@/lib/funnel';
import {
  packVideoCapacity,
  purchaseGuidance,
  VIDEO_PACKS,
} from '@/lib/purchase-guidance';
import { currentPathWithQuery } from '@/lib/redirect';
import { m } from '@/paraglide/messages.js';
import { useFunnel } from '@/hooks/use-funnel';
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
  requiredCredits,
  balanceCredits = 0,
  clipSeconds,
  durationTier,
  trackingVisible = true,
}: {
  title?: string;
  /** `h1` when the block is the page's main content (the /pricing route). */
  headingAs?: 'h1' | 'h2';
  /** `dialog` drops the page-section chrome for use inside a modal. */
  variant?: 'section' | 'dialog';
  beforeCheckout?: () => Promise<unknown>;
  requiredCredits?: number;
  balanceCredits?: number;
  clipSeconds?: number;
  durationTier?: 5 | 10;
  trackingVisible?: boolean;
} = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { track } = useFunnel();
  const viewTracked = useRef(false);
  const checkoutLock = useRef(false);
  const [preparing, setPreparing] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<5 | 10>(
    durationTier ?? (clipSeconds && clipSeconds > 5 ? 10 : 5)
  );
  useEffect(() => {
    if (durationTier) setSelectedDuration(durationTier);
    else if (clipSeconds) setSelectedDuration(clipSeconds > 5 ? 10 : 5);
  }, [durationTier, clipSeconds]);
  const [unsavedCheckout, setUnsavedCheckout] = useState<{
    plan: PricingPlan;
    provider?: PaymentProvider;
  }>();
  const guidance =
    requiredCredits === undefined && selectedDuration === 5
      ? undefined
      : purchaseGuidance(
          Math.max(requiredCredits ?? 0, genjutsuCredits(selectedDuration)),
          balanceCredits
        );
  useEffect(() => {
    if (!trackingVisible) {
      viewTracked.current = false;
      return;
    }
    if (
      !viewTracked.current &&
      track('pricing_view', {
        surface: variant === 'dialog' ? 'dialog' : 'pricing',
      })
    )
      viewTracked.current = true;
  }, [trackingVisible, track, variant]);

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

  function features(credits: number): PricingFeature[] {
    return [
      {
        icon: Film,
        label:
          packVideoCapacity(credits, selectedDuration) === 0
            ? m['landing.pricing.five_second_only']()
            : m['landing.pricing.duration_capacity']({
                count: packVideoCapacity(credits, selectedDuration),
                seconds: selectedDuration,
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
      description: m['landing.pricing.pack_units']({
        count: Math.floor(product.credits / perVideo),
      }),
      price: usd(product.priceInCents),
      featured: guidance ? guidance.recommended === productId : opts.featured,
      badge: guidance
        ? guidance.recommended === productId
          ? clipSeconds
            ? m['landing.pricing.recommended_clip']()
            : m['landing.pricing.recommended_duration']()
          : undefined
        : opts.badge,
      disabled: guidance ? !guidance.coversClip(productId) : false,
      notice:
        guidance && !guidance.coversClip(productId) && selectedDuration === 10
          ? m['landing.pricing.ten_second_minimum']()
          : guidance && clipSeconds
            ? guidance.coversClip(productId)
              ? m['landing.pricing.covers_clip']()
              : m['landing.pricing.short_clip_only']()
            : undefined,
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
      ],
    },
  ];

  const checkoutMutation = useMutation({
    mutationFn: async ({
      plan,
      provider,
    }: {
      plan: PricingPlan;
      provider?: PaymentProvider;
    }) => {
      const data = await apiPost<{ checkout_url?: string }>(
        '/api/payment/checkout',
        {
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
        }
      );
      if (
        !data.checkout_url ||
        new URL(data.checkout_url).protocol !== 'https:'
      )
        throw new Error('Checkout failed');
      return data as { checkout_url: string };
    },
    onSuccess: (data, { plan, provider }) => {
      track('checkout_created', eventDetails(plan, provider));
      setRedirecting(true);
      window.location.href = data.checkout_url;
    },
    onError: (err: Error, { plan, provider }) => {
      track('checkout_error', {
        ...eventDetails(plan, provider),
        outcome: 'request_failed',
      });
      toast.error(err?.message || 'Checkout failed');
      setLoadingProvider(null);
    },
  });

  function eventDetails(
    plan: PricingPlan,
    provider?: PaymentProvider
  ): FunnelProperties {
    return {
      product_id: VIDEO_PACKS.includes(plan.id as (typeof VIDEO_PACKS)[number])
        ? (plan.id as (typeof VIDEO_PACKS)[number])
        : undefined,
      payment_provider: provider,
      value: (plan.priceInCents || 0) / 100,
      surface: variant === 'dialog' ? 'dialog' : 'pricing',
    };
  }

  async function startCheckout(
    plan: PricingPlan,
    provider?: PaymentProvider,
    allowUnsaved = false
  ) {
    if (checkoutLock.current || redirecting || plan.disabled) return;
    checkoutLock.current = true;
    setPreparing(true);
    try {
      if (!allowUnsaved) {
        try {
          await beforeCheckout?.();
        } catch {
          track('draft_save_failed', { outcome: 'storage_unavailable' });
          setPendingPlan(plan);
          setUnsavedCheckout({ plan, provider });
          setModalOpen(true);
          return;
        }
      }
      setUnsavedCheckout(undefined);
      setLoadingProvider(provider ?? null);
      track('begin_checkout', eventDetails(plan, provider));
      await checkoutMutation.mutateAsync({ plan, provider });
    } catch {
      // The mutation's onError displays the failure; allow a deliberate retry.
    } finally {
      checkoutLock.current = false;
      setPreparing(false);
    }
  }

  async function handleCheckout(plan: PricingPlan) {
    if (checkoutLock.current || redirecting || plan.disabled) return;
    track('select_item', eventDetails(plan));
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
          <div
            role="group"
            aria-label={m['landing.pricing.duration_label']()}
            className="border-border bg-muted/40 mx-auto mt-6 inline-flex rounded-full border p-1"
          >
            {([5, 10] as const).map((seconds) => (
              <button
                key={seconds}
                type="button"
                data-testid={`pricing-duration-${seconds}`}
                aria-pressed={selectedDuration === seconds}
                disabled={
                  preparing || checkoutMutation.isPending || redirecting
                }
                onClick={() => setSelectedDuration(seconds)}
                className={`min-h-10 rounded-full px-6 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
                  selectedDuration === seconds
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m['landing.pricing.duration_option']({ seconds })}
              </button>
            ))}
          </div>
        </div>
        {clipSeconds && (
          <p
            data-testid="pricing-clip-guidance"
            className="border-primary/20 bg-primary/5 text-primary-text mb-7 rounded-xl border px-4 py-3 text-center text-sm leading-relaxed"
          >
            {m['landing.pricing.clip_requirement']({
              seconds: String(Number(clipSeconds.toFixed(2))),
              count: clipSeconds <= 5 ? 1 : 2,
            })}
          </p>
        )}
        <PricingTable
          groups={groups}
          onCheckout={handleCheckout}
          busy={preparing || checkoutMutation.isPending || redirecting}
        />
      </div>

      <PaymentProviderModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (preparing || checkoutMutation.isPending || redirecting) return;
          setModalOpen(open);
          if (!open) {
            setPendingPlan(null);
            setLoadingProvider(null);
            setUnsavedCheckout(undefined);
          }
        }}
        providers={enabledProviders.length ? enabledProviders : ['stripe']}
        loadingProvider={loadingProvider}
        onSelect={handleProviderSelect}
        planName={pendingPlan?.name}
        price={pendingPlan?.price}
        title={
          unsavedCheckout
            ? m['landing.pricing.save_failed_title']()
            : m['common.pricing.choose_payment']()
        }
        description={
          unsavedCheckout
            ? m['landing.pricing.save_failed_body']()
            : pendingPlan
              ? m['common.pricing.payment_for']({
                  plan: pendingPlan.name,
                  price: pendingPlan.price,
                })
              : m['common.pricing.choose_payment_desc']()
        }
        labels={{ waffo: m['landing.pricing.provider_waffo_label']() }}
        hints={{
          paypal: m['landing.pricing.provider_paypal_hint'](),
          waffo: m['landing.pricing.provider_waffo_hint'](),
        }}
        busy={preparing || checkoutMutation.isPending || redirecting}
        notice={
          unsavedCheckout && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                data-testid="continue-unsaved-checkout"
                disabled={
                  preparing || checkoutMutation.isPending || redirecting
                }
                className="bg-primary text-primary-foreground min-h-11 rounded-lg px-4 py-2 font-medium disabled:opacity-50"
                onClick={() =>
                  void startCheckout(
                    unsavedCheckout.plan,
                    unsavedCheckout.provider,
                    true
                  )
                }
              >
                {m['landing.pricing.continue_payment']()}
              </button>
              <button
                type="button"
                disabled={
                  preparing || checkoutMutation.isPending || redirecting
                }
                className="min-h-11 rounded-lg border px-4 py-2"
                onClick={() => {
                  setUnsavedCheckout(undefined);
                  setModalOpen(false);
                }}
              >
                {m['landing.pricing.back_to_files']()}
              </button>
            </div>
          )
        }
      />
    </Wrapper>
  );
}
