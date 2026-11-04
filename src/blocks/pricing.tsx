import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Infinity as InfinityIcon, Lock, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { GENJUTSU_CREDITS, genjutsuCredits } from '@/config/genjutsu';
import { pricingCatalog, type PricingProduct } from '@/config/pricing';
import { apiPost } from '@/lib/api-client';
import {
  readSessionValue,
  removeSessionValue,
  writeSessionValue,
} from '@/lib/browser-session';
import {
  checkoutReturnPath,
  withoutCheckoutReturn,
  type CheckoutReturnTarget,
} from '@/lib/checkout-return';
import { paymentOptions, formatUsd as usd } from '@/lib/payment-options';
import { currentPathWithQuery } from '@/lib/redirect';
import { track } from '@/lib/track';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { useCheckoutReturn } from '@/hooks/use-checkout-return';
import { usePublicConfig } from '@/hooks/use-public-config';
import { PageBreadcrumbs } from '@/blocks/page-breadcrumbs';
import { CreditPackList, type CreditPack } from '@/components/credit-pack-list';
import { PaymentButtons } from '@/components/payment-buttons';
import type { PaymentProvider } from '@/components/payment-provider-modal';
import type { PricingPlan } from '@/components/pricing-table';
import { Button } from '@/components/ui/button';

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
  selectedVideo,
  returnTarget = variant === 'dialog' ? 'genjutsu' : 'pricing',
}: {
  title?: string;
  /** Replaces the default description line under the title. */
  description?: string;
  /** Shown above the title in the dialog, e.g. the visitor's own media. */
  summary?: ReactNode;
  selectedVideo?: { name: string; seconds: number; aspect: string };
  /** `h1` when the block is the page's main content (the /pricing route). */
  headingAs?: 'h1' | 'h2';
  /** `dialog` drops the page-section chrome for use inside a modal. */
  variant?: 'section' | 'dialog';
  beforeCheckout?: () => Promise<unknown>;
  clipSeconds?: number;
  balanceCredits?: number;
  singleVideo?: PricingProduct;
  returnTarget?: CheckoutReturnTarget;
} = {}) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const {
    data: configsData,
    refetch: refetchConfigs,
    isPending: configsPending,
    isError: configsError,
    isFetching: configsFetching,
  } = usePublicConfig();
  const [selectedDialogId, setSelectedDialogId] = useState<string>();
  useEffect(() => {
    const saved = readSessionValue('genjutsu-checkout-choice');
    if (!saved) return;
    try {
      const choice = JSON.parse(saved);
      if (
        choice.path !== withoutCheckoutReturn(currentPathWithQuery('/pricing'))
      )
        return;
      if (
        Date.now() - choice.savedAt < 10 * 60 * 1000 &&
        pricingCatalog[choice.productId]?.available !== false &&
        pricingCatalog[choice.productId]
      )
        setSelectedDialogId(choice.productId);
      removeSessionValue('genjutsu-checkout-choice');
    } catch {
      removeSessionValue('genjutsu-checkout-choice');
    }
  }, []);
  const [loadingProvider, setLoadingProvider] =
    useState<PaymentProvider | null>(null);
  const [preparingCheckout, setPreparingCheckout] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string>();
  const checkoutStarting = useRef(false);
  const checkoutRedirected = useRef(false);
  const dialog = variant === 'dialog';
  useCheckoutReturn(
    'pricing',
    () => {
      document.getElementById('pricing')?.scrollIntoView({ block: 'start' });
    },
    !dialog
  );

  function returnPaths() {
    // Keep the locale, effect query and hash on provider redirects.
    const path = withoutCheckoutReturn(window.location.href);
    return {
      redirect: path,
      cancel_redirect: checkoutReturnPath(path, returnTarget),
    };
  }

  const enabledProviders = useMemo(
    () => (configsData ? paymentOptions(configsData) : []),
    [configsData]
  );
  const directStripe =
    !configsError &&
    enabledProviders.length === 1 &&
    enabledProviders[0] === 'stripe';
  // One shared prepaid balance for every generation API.
  const clipCost =
    singleVideo?.credits ?? (clipSeconds ? genjutsuCredits(clipSeconds) : 0);
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
        ? product.credits < clipCost && coversClip
          ? m['landing.pricing.complete_current_video']()
          : m['landing.text_video.pack_count']({
              count: Math.floor(product.credits / clipCost),
            })
        : undefined,
      price: usd(product.priceInCents),
      priceInCents: product.priceInCents,
      currency: product.currency,
      credits: product.credits,
      features: !coversClip
        ? [{ label: m['landing.pricing.insufficient_selected_clip']() }]
        : [],
      disabled: dialog && !coversClip,
      buttonText: m['landing.pricing.buy_now'](),
    };
  }
  // Public packs lead with usable video counts. The server still grants the
  // same balance from its authoritative catalog.
  function creditPack(
    productId: string,
    name: string,
    tag?: string
  ): CreditPack {
    const product = pricingCatalog[productId];
    // Saving against the 1 credit = $0.01 face value of the balance.
    const off = Math.floor((1 - product.priceInCents / product.credits) * 100);
    return {
      ...plan(productId, name, productId === 'pack_starter'),
      amount:
        product.credits === GENJUTSU_CREDITS
          ? m['landing.pricing.video_one']()
          : m['landing.pricing.video_many']({
              count: Math.floor(product.credits / GENJUTSU_CREDITS),
            }),
      detail: m['landing.pricing.video_unit']({
        price: usd(
          Math.round(
            product.priceInCents /
              Math.floor(product.credits / GENJUTSU_CREDITS)
          )
        ),
      }),
      discount: off > 0 ? `-${off}%` : undefined,
      originalPrice: off > 0 ? usd(product.credits) : undefined,
      tag,
    };
  }
  const creditPacks: CreditPack[] = [
    creditPack('pack_starter', m['landing.pricing.pack_starter']()),
    creditPack('pack_2v', m['landing.pricing.pack_2v']()),
    creditPack('pack_plus', m['landing.pricing.pack_plus']()),
    creditPack('pack_pro', m['landing.pricing.pack_pro']()),
    creditPack('pack_7v', m['landing.pricing.pack_7v']()),
    creditPack('pack_10', m['landing.pricing.pack_10']()),
    creditPack('pack_20', m['landing.pricing.pack_20']()),
    creditPack('pack_50', m['landing.pricing.pack_50']()),
    creditPack('pack_100', m['landing.pricing.pack_100']()),
    creditPack(
      'pack_200',
      m['landing.pricing.pack_200'](),
      m['landing.pricing.tag_best_value']()
    ),
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
        payment_provider: provider,
        locale: getLocale(),
        ...returnPaths(),
      }),
    onSuccess: (data, variables) => {
      if (!data?.checkout_url) {
        toast.error(m['landing.pricing.checkout_failed']());
        setLoadingProvider(null);
        setLoadingPlanId(undefined);
        return;
      }
      track('checkout_redirect', {
        plan: variables.plan.productId || '',
        provider: variables.provider || '',
        flow: directStripe ? 'stripe_pack_click_v1' : 'direct_payment_v1',
      });
      writeSessionValue(
        'genjutsu-checkout-choice',
        JSON.stringify({
          productId: variables.plan.productId,
          path: withoutCheckoutReturn(currentPathWithQuery('/pricing')),
          savedAt: Date.now(),
        })
      );
      checkoutRedirected.current = true;
      // Back/swipe-back must restore the same panel even when the browser
      // discards this document. Stripe's cancel link uses the same destination.
      window.history.replaceState(
        window.history.state,
        '',
        returnPaths().cancel_redirect
      );
      window.location.href = data.checkout_url;
    },
    onError: (err: any) => {
      track('checkout_failed', { error: String(err?.message || '') });
      toast.error(err?.message || m['landing.pricing.checkout_failed']());
      setLoadingProvider(null);
      setLoadingPlanId(undefined);
    },
  });

  // Leaving for a provider page and coming back without paying (bfcache
  // restore, tab refocus) must re-enable provider selection: the spinner
  // state freezes with the page and would otherwise stay forever.
  useEffect(() => {
    const release = () => {
      // Refocusing during draft preparation or the request must not unlock
      // checkout. Only a return from an actual redirect releases this state.
      if (!checkoutRedirected.current) return;
      checkoutRedirected.current = false;
      checkoutStarting.current = false;
      setLoadingProvider(null);
      setLoadingPlanId(undefined);
    };
    const onPageshow = (event: PageTransitionEvent) => {
      if (event.persisted) release();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') release();
    };
    window.addEventListener('pageshow', onPageshow);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', release);
    return () => {
      window.removeEventListener('pageshow', onPageshow);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', release);
    };
  }, []);

  async function startCheckout(plan: PricingPlan, provider?: PaymentProvider) {
    // handleCheckout acquires the lock before any asynchronous work.
    setPreparingCheckout(true);
    setLoadingProvider(provider ?? null);
    try {
      await beforeCheckout?.();
    } catch {
      toast.error(m['landing.pricing.save_media_failed']());
      checkoutStarting.current = false;
      setPreparingCheckout(false);
      setLoadingProvider(null);
      setLoadingPlanId(undefined);
      return;
    }
    setPreparingCheckout(false);
    setLoadingProvider(provider ?? null);
    try {
      await checkoutMutation.mutateAsync({ plan, provider });
    } catch {
      // The mutation's onError reports the failure and releases the buttons.
    } finally {
      checkoutStarting.current = false;
    }
  }

  async function handleCheckout(plan: PricingPlan, provider: PaymentProvider) {
    if (
      checkoutStarting.current ||
      checkoutMutation.isPending ||
      preparingCheckout ||
      loadingProvider ||
      plan.disabled ||
      sessionPending
    )
      return;
    // Lock synchronously, including configuration loading and draft saving.
    checkoutStarting.current = true;
    setLoadingProvider(provider);
    setLoadingPlanId(plan.id);
    track('plan_click', {
      plan: plan.productId || '',
      signedIn: Boolean(session?.user),
      provider,
      surface: dialog ? 'paywall' : 'pricing',
      flow: directStripe ? 'stripe_pack_click_v1' : 'direct_payment_v1',
    });
    if (!session?.user) {
      const path = currentPathWithQuery('/pricing');
      writeSessionValue(
        'genjutsu-checkout-choice',
        JSON.stringify({ productId: plan.productId, path, savedAt: Date.now() })
      );
      const callbackUrl = encodeURIComponent(path);
      checkoutRedirected.current = true;
      router.push(`/sign-in?callbackUrl=${callbackUrl}`);
      return;
    }
    const cfg = configsData ?? (await refetchConfigs()).data;
    if (!cfg || !paymentOptions(cfg).includes(provider)) {
      toast.error(m['landing.pricing.payment_unavailable']());
      checkoutStarting.current = false;
      setLoadingProvider(null);
      setLoadingPlanId(undefined);
      void refetchConfigs();
      return;
    }
    await startCheckout(plan, provider);
  }

  const busy =
    preparingCheckout || checkoutMutation.isPending || Boolean(loadingProvider);
  const selectedPlan =
    creditPacks.find((pack) => pack.id === selectedDialogId) ??
    creditPacks.find((pack) => !pack.disabled) ??
    creditPacks[0];

  function paymentLabel(provider: PaymentProvider, price: string) {
    if (
      provider === 'waffo' ||
      (enabledProviders.length === 1 && ['stripe', 'creem'].includes(provider))
    )
      return m['landing.pricing.pay_card']({ price });
    if (provider === 'paypal')
      return m['landing.pricing.pay_paypal']({ price });
    const names: Record<PaymentProvider, string> = {
      waffo: m['common.pricing.provider_card'](),
      stripe: 'Stripe',
      creem: 'Creem',
      paypal: 'PayPal',
      alipay: 'Alipay',
      wechat: 'WeChat Pay',
    };
    return m['landing.pricing.pay_method']({ method: names[provider], price });
  }

  function paymentActions(pack: PricingPlan) {
    if (configsPending || (!configsData && configsFetching))
      return (
        <Button className="h-12 w-full rounded-xl" disabled>
          {m['landing.pricing.loading_payment']()}
        </Button>
      );
    if (configsError || !enabledProviders.length)
      return (
        <div role="status" className="space-y-2 text-center text-sm">
          <p className="text-muted-foreground">
            {m['landing.pricing.payment_unavailable']()}
          </p>
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl"
            disabled={configsFetching}
            onClick={() => void refetchConfigs()}
          >
            {m['landing.pricing.retry_payment']()}
          </Button>
        </div>
      );
    return (
      <PaymentButtons
        options={enabledProviders.map((provider) => ({
          provider,
          label: paymentLabel(provider, pack.price),
        }))}
        busy={busy || Boolean(pack.disabled) || sessionPending}
        loadingProvider={loadingProvider}
        processingLabel={
          preparingCheckout
            ? m['landing.pricing.preparing_video']()
            : m['common.pricing.processing']()
        }
        onSelect={(provider) => void handleCheckout(pack, provider)}
      />
    );
  }

  const purchaseList = (
    <>
      {directStripe && (
        <p className="text-muted-foreground mb-3 text-center text-sm">
          {m['landing.pricing.stripe_pack_hint']()}
        </p>
      )}
      <CreditPackList
        packs={
          singleVideo
            ? creditPacks.map((pack) => ({
                ...pack,
                amount: pack.description ?? pack.amount,
                detail: m['landing.pricing.feature_no_subscription'](),
              }))
            : creditPacks
        }
        visibleCount={3}
        moreLabel={m['landing.pricing.more_videos']()}
        selectedId={selectedPlan.id}
        onSelectionChange={setSelectedDialogId}
        busy={busy || sessionPending || configsPending}
        checkoutOnSelect={directStripe}
        loadingId={loadingPlanId}
        buyLabel={(pack) =>
          directStripe
            ? m['landing.pricing.continue_stripe']({ price: pack.price })
            : m['landing.pricing.buy_selected']({ price: pack.price })
        }
        processingLabel={
          preparingCheckout
            ? m['landing.pricing.preparing_video']()
            : m['common.pricing.processing']()
        }
        footnote={dialog ? undefined : m['landing.pricing.video_count_note']()}
        checkoutActions={paymentActions}
        perks={
          dialog
            ? undefined
            : [
                {
                  icon: <Lock className="size-3.5 shrink-0" aria-hidden />,
                  label: m['landing.pricing.secure_checkout'](),
                },
                {
                  icon: <RotateCcw className="size-3.5 shrink-0" aria-hidden />,
                  label: m['landing.pricing.failure_policy_short'](),
                },
                {
                  icon: (
                    <InfinityIcon className="size-3.5 shrink-0" aria-hidden />
                  ),
                  label: m['landing.pricing.feature_no_subscription'](),
                },
              ]
        }
        onCheckout={(pack) => {
          if (enabledProviders[0])
            void handleCheckout(pack, enabledProviders[0]);
        }}
      />
    </>
  );

  const Wrapper = dialog ? 'div' : 'section';

  return (
    <Wrapper
      id={dialog ? undefined : 'pricing'}
      className={
        dialog ? undefined : 'border-border px-4 py-6 sm:border-t sm:py-32'
      }
    >
      <div className="mx-auto max-w-6xl">
        {!dialog && Heading === 'h1' && (
          <PageBreadcrumbs
            currentPage={m['landing.nav.pricing']()}
            className="mb-6"
          />
        )}
        <div className={dialog ? 'mb-4 text-center' : 'mb-20 text-center'}>
          {dialog && summary}
          <Heading
            className={
              dialog
                ? 'eg-heading text-2xl sm:text-3xl'
                : 'eg-heading text-4xl sm:text-5xl'
            }
          >
            {title ??
              (dialog
                ? m['landing.pricing.purchase_title']()
                : m['landing.pricing.title']())}
          </Heading>
          <p
            className={cn(
              'text-muted-foreground',
              dialog ? 'mt-2 text-sm' : 'mt-5'
            )}
          >
            <span className={dialog ? undefined : 'max-md:hidden'}>
              {description ??
                (dialog
                  ? m['landing.pricing.purchase_description']()
                  : m['landing.pricing.purchase_intro']({
                      price: usd(pricingCatalog.pack_starter.priceInCents),
                    }))}
            </span>
            {!dialog && (
              <span className="md:hidden">
                {m['landing.pricing.purchase_intro']({
                  price: usd(pricingCatalog.pack_starter.priceInCents),
                })}
              </span>
            )}
          </p>
          {/* The paywall keeps one line; billing details live on /pricing. */}
          {!dialog && (
            <>
              <p className="text-muted-foreground mt-2 text-sm max-md:hidden">
                {singleVideo
                  ? `${singleVideo.productName}. ${m['landing.text_video.audio']()}`
                  : m['landing.pricing.video_rules']()}
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
        {dialog ? (
          <div className="mx-auto max-w-xl" data-testid="video-purchase-panel">
            {(selectedVideo || singleVideo) && (
              <div
                className="border-border mb-4 rounded-xl border px-4 py-3 text-center"
                data-testid="selected-video-details"
              >
                <p className="text-sm font-medium">
                  {selectedVideo?.name ?? singleVideo?.productName}
                </p>
                {selectedVideo && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {m['landing.pricing.selected_video_specs']({
                      seconds: selectedVideo.seconds,
                      aspect: selectedVideo.aspect,
                    })}
                  </p>
                )}
              </div>
            )}
            {directStripe ? (
              purchaseList
            ) : (
              <>
                <div
                  className="border-primary/50 bg-primary/[0.04] rounded-2xl border p-4 sm:p-5"
                  data-testid={`paywall-plan-${selectedPlan.productId}`}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-medium">
                        {singleVideo
                          ? selectedPlan.description
                          : selectedPlan.amount}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {m['landing.pricing.feature_no_subscription']()}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-muted-foreground text-xs">
                        {m['landing.pricing.order_total']()}
                      </p>
                      <p
                        className="mt-1 text-3xl font-semibold tracking-tight tabular-nums"
                        data-testid="purchase-total"
                      >
                        {selectedPlan.price}
                      </p>
                    </div>
                  </div>
                  {selectedPlan.disabled && (
                    <p className="text-destructive mb-3 text-sm">
                      {m['landing.pricing.insufficient_selected_clip']()}
                    </p>
                  )}
                  {paymentActions(selectedPlan)}
                </div>
                <details className="group border-border mt-4 rounded-xl border px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    {m['landing.pricing.more_videos']()}
                  </summary>
                  <div
                    role="radiogroup"
                    aria-label={m['landing.pricing.choose_videos']()}
                    className="mt-3 grid gap-2"
                  >
                    {creditPacks.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        role="radio"
                        aria-checked={pack.id === selectedPlan.id}
                        data-testid={`paywall-choice-${pack.productId}`}
                        disabled={busy || pack.disabled}
                        onClick={() => setSelectedDialogId(pack.id)}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50',
                          pack.id === selectedPlan.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <span>
                          {singleVideo ? pack.description : pack.amount}
                        </span>
                        <span className="font-medium tabular-nums">
                          {pack.price}
                        </span>
                      </button>
                    ))}
                  </div>
                </details>
              </>
            )}
            <p className="text-muted-foreground mt-3 text-center text-xs">
              {m['landing.pricing.failure_policy_short']()}
            </p>
          </div>
        ) : (
          purchaseList
        )}
        {dialog && (
          <p className="text-muted-foreground mt-5 flex items-center justify-center gap-1.5 text-center text-xs">
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            {m['landing.pricing.secure_checkout']()}
          </p>
        )}
      </div>
    </Wrapper>
  );
}
