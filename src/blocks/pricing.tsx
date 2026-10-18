'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Film,
  Infinity as InfinityIcon,
  Lock,
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
import { Button } from '@/components/ui/button';

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
  description,
  summary,
}: {
  title?: string;
  /** Replaces the default description line under the title. */
  description?: string;
  /** Shown above the title in the dialog, e.g. the visitor's own media. */
  summary?: ReactNode;
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
        // A first-time buyer at the paywall is deciding on one video: the
        // single-video pack is the recommendation there, not the $24.90 bundle.
        plan(
          'pack_starter',
          m['landing.pricing.pack_starter'](),
          dialog && firstOrder
        ),
        plan(
          'pack_plus',
          m['landing.pricing.pack_plus'](),
          !(dialog && firstOrder)
        ),
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
        toast.error(m['landing.pricing.checkout_failed']());
        setLoadingProvider(null);
        return;
      }
      track('checkout_redirect');
      window.location.href = data.checkout_url;
    },
    onError: (err: any) => {
      track('checkout_failed', { error: String(err?.message || '') });
      toast.error(err?.message || m['landing.pricing.checkout_failed']());
      setLoadingProvider(null);
    },
  });

  async function startCheckout(plan: PricingPlan, provider?: PaymentProvider) {
    // Repeat clicks while a checkout is in flight would create duplicate orders.
    if (checkoutMutation.isPending || loadingProvider) return;
    try {
      await beforeCheckout?.();
    } catch {
      toast.error(m['landing.pricing.save_media_failed']());
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
        dialog ? undefined : 'border-border px-4 py-6 sm:border-t sm:py-32'
      }
    >
      <div className="mx-auto max-w-6xl">
        <div className={dialog ? 'mb-6 px-8 text-center' : 'mb-20 text-center'}>
          {dialog && summary}
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
              {description ?? m['landing.pricing.description']()}
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
        ) : dialog ? (
          <PaywallPlans
            plans={groups.flatMap((group) => group.plans)}
            quantity={(plan) =>
              packVideos(plan.productId) || plan.description || ''
            }
            busy={checkoutMutation.isPending || !!loadingProvider}
            onCheckout={handleCheckout}
          />
        ) : (
          <PricingTable groups={groups} onCheckout={handleCheckout} />
        )}
        {dialog && (
          <p className="text-muted-foreground mt-5 flex items-center justify-center gap-1.5 text-center text-xs">
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            {m['landing.pricing.secure_checkout']()}
          </p>
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

/**
 * Paywall layout: one recommended pack as the obvious next step, the rest as
 * compact alternatives, and the perks every pack shares stated once instead
 * of repeated per card.
 */
function PaywallPlans({
  plans,
  quantity,
  busy,
  onCheckout,
}: {
  plans: PricingPlan[];
  quantity: (plan: PricingPlan) => string;
  busy: boolean;
  onCheckout: (plan: PricingPlan) => void;
}) {
  const top = plans.find((plan) => plan.featured) ?? plans[0];
  const rest = plans.filter((plan) => plan !== top);
  // Per-plan notes without an icon (e.g. "doesn't cover this clip").
  const warnings = (plan: PricingPlan) =>
    plan.features.flatMap((feature) =>
      typeof feature !== 'string' && !feature.icon ? [feature.label] : []
    );
  if (!top) return null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <div
        data-testid={`paywall-plan-${top.productId}`}
        className="border-primary/70 bg-primary/[0.06] shadow-primary/60 relative rounded-2xl border p-5 shadow-[0_24px_60px_-36px]"
      >
        {top.badge && (
          <span className="bg-primary text-primary-foreground absolute -top-3 left-5 rounded-full px-3 py-1 text-xs font-semibold">
            {top.badge}
          </span>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-sm font-medium">
              {top.name}
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight tabular-nums">
                {top.price}
              </span>
              {top.originalPrice && (
                <span className="text-muted-foreground text-base line-through">
                  {top.originalPrice}
                </span>
              )}
            </p>
            <p className="text-foreground/80 mt-1 text-sm">{quantity(top)}</p>
            {warnings(top).map((warning) => (
              <p key={warning} className="text-destructive mt-1 text-xs">
                {warning}
              </p>
            ))}
          </div>
          <Button
            className="h-12 w-full rounded-xl px-8 text-base font-semibold sm:w-auto"
            disabled={busy || top.disabled}
            onClick={() => onCheckout(top)}
          >
            {busy ? m['common.pricing.processing']() : top.buttonText}
          </Button>
        </div>
      </div>

      {rest.map((plan) => (
        <div
          key={plan.id}
          data-testid={`paywall-plan-${plan.productId}`}
          className="border-border hover:border-foreground/30 flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{plan.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {quantity(plan)}
            </p>
            {warnings(plan).map((warning) => (
              <p key={warning} className="text-destructive text-xs">
                {warning}
              </p>
            ))}
          </div>
          <span className="text-lg font-semibold tabular-nums">
            {plan.price}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            disabled={busy || plan.disabled}
            onClick={() => onCheckout(plan)}
          >
            {plan.buttonText}
          </Button>
        </div>
      ))}

      <ul className="text-muted-foreground mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs">
        {[
          m['landing.pricing.shared_modes'](),
          m['landing.pricing.feature_no_subscription'](),
          m['landing.pricing.failure_policy_short'](),
        ].map((perk) => (
          <li key={perk} className="flex items-center gap-1.5">
            <Check className="text-primary size-3.5 shrink-0" aria-hidden />
            {perk}
          </li>
        ))}
      </ul>
    </div>
  );
}
