import {
  BillingPeriod,
  Environment,
  TaxCategory,
  verifyWebhook,
  WaffoPancake,
  WebhookEventType,
  type WebhookEvent,
  type WebhookEventData,
} from '@waffo/pancake-ts';

import {
  PaymentEventType,
  PaymentInterval,
  PaymentStatus,
  PaymentType,
  SubscriptionCycleType,
  SubscriptionStatus,
  WebhookIgnoredError,
  type PaymentConfigs,
  type PaymentEvent,
  type PaymentOrder,
  type PaymentProvider,
  type PaymentSession,
  type SubscriptionInfo,
} from './types';

/** Waffo Pancake payment provider configuration. */
export interface WaffoConfigs extends PaymentConfigs {
  merchantId: string;
  privateKey: string;
  storeId?: string;
  environment?: 'test' | 'prod';
  taxCategory?: string;
  webhookPublicKey?: string;
}

type WaffoGraphqlPayment = {
  id?: string;
  status?: string;
  orderId?: string;
  orderMerchantExternalId?: string;
  snapshotAmountDetails?: {
    currency?: string;
    total?: string;
    subtotal?: string;
    phase?: string;
  };
  createdAt?: string;
  onetimeOrder?: {
    id?: string;
    buyerEmail?: string;
    status?: string;
    onetimeProduct?: { id?: string; name?: string };
  } | null;
  subscriptionOrder?: {
    id?: string;
    buyerEmail?: string;
    status?: string;
    billingPeriod?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    canceledAt?: string;
    subscriptionProduct?: { id?: string; name?: string };
  } | null;
};

type WaffoGraphqlResult = {
  data?: {
    payments?: WaffoGraphqlPayment[];
  } | null;
  errors?: Array<{ message?: string }>;
};

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'ISK',
  'JPY',
  'KMF',
  'KRW',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

function toMinorUnits(value: unknown, currency: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  const decimals = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
  return Math.round(amount * 10 ** decimals);
}

function toDisplayAmount(amount: number, currency: string): string {
  const decimals = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
  return (amount / 10 ** decimals).toFixed(decimals);
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function mapInterval(period?: string): PaymentInterval | undefined {
  switch (period) {
    case BillingPeriod.Weekly:
      return PaymentInterval.WEEK;
    case BillingPeriod.Monthly:
      return PaymentInterval.MONTH;
    case BillingPeriod.Quarterly:
      return PaymentInterval.MONTH;
    case BillingPeriod.Yearly:
      return PaymentInterval.YEAR;
    default:
      return undefined;
  }
}

function mapSubscriptionStatus(
  status?: string
): SubscriptionStatus | undefined {
  switch (status) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'canceling':
      return SubscriptionStatus.PENDING_CANCEL;
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    case 'past_due':
      return SubscriptionStatus.PAUSED;
    case 'trialing':
      return SubscriptionStatus.TRIALING;
    default:
      return status ? (status as SubscriptionStatus) : undefined;
  }
}

function mapPaymentStatus(status?: string): PaymentStatus {
  switch (status) {
    case 'completed':
    case 'active':
    case 'succeeded':
      return PaymentStatus.SUCCESS;
    case 'canceled':
    case 'cancelled':
      return PaymentStatus.CANCELED;
    case 'failed':
      return PaymentStatus.FAILED;
    default:
      return PaymentStatus.PROCESSING;
  }
}

function metadataFrom(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      String(item),
    ])
  );
}

/**
 * Waffo Pancake implementation.
 *
 * Waffo's SDK uses display amounts ("9.99"), while ShipAny's payment
 * contract uses minor units (999). The conversion is kept in this adapter so
 * the catalog and all other payment providers retain their existing semantics.
 */
export class WaffoProvider implements PaymentProvider {
  readonly name = 'waffo';
  configs: WaffoConfigs;

  private client: WaffoPancake;

  constructor(configs: WaffoConfigs) {
    this.configs = configs;
    this.client = new WaffoPancake({
      merchantId: configs.merchantId,
      privateKey: configs.privateKey,
      webhookPublicKey: configs.webhookPublicKey || undefined,
    });
  }

  async createPayment({ order }: { order: PaymentOrder }) {
    if (!order.productId) throw new Error('Waffo productId is required');
    if (!order.price) throw new Error('price is required');
    if (!order.orderNo) throw new Error('orderNo is required');

    const currency = order.price.currency.toUpperCase();
    const taxCategory = (this.configs.taxCategory ||
      TaxCategory.SaaS) as TaxCategory;
    const metadata = metadataFrom(order.metadata);
    const buyerIdentity =
      metadata.userId ||
      order.customer?.id ||
      order.customer?.email ||
      order.orderNo;

    const result = await this.client.checkout.authenticated.create(
      {
        productId: order.productId,
        currency,
        buyerIdentity,
        buyerEmail: order.customer?.email,
        priceSnapshot: {
          amount: toDisplayAmount(order.price.amount, currency),
          taxCategory,
        },
        successUrl: order.successUrl,
        metadata,
        orderMerchantExternalId: order.orderNo,
        withTrial:
          order.type === PaymentType.SUBSCRIPTION &&
          !!order.plan?.trialPeriodDays,
      },
      { idempotencyKey: `shipany-checkout-${order.orderNo}` }
    );

    return {
      provider: this.name,
      checkoutParams: {
        productId: order.productId,
        productType:
          order.type === PaymentType.SUBSCRIPTION ? 'subscription' : 'onetime',
        currency,
        orderMerchantExternalId: order.orderNo,
      },
      checkoutInfo: {
        sessionId: result.sessionId,
        checkoutUrl: result.checkoutUrl,
      },
      checkoutResult: result,
      metadata: {
        ...metadata,
        orderMerchantExternalId: order.orderNo,
      },
    };
  }

  async getPaymentSession({ sessionId }: { sessionId: string }) {
    if (!sessionId) throw new Error('sessionId is required');

    const result = (await this.client.graphql.query({
      query: `query ($ref: String!) {
        payments(filter: { orderMerchantExternalId: { eq: $ref } }, limit: 1) {
          id status orderId orderMerchantExternalId createdAt
          snapshotAmountDetails { currency total subtotal phase }
          onetimeOrder {
            id buyerEmail status
            onetimeProduct { id name }
          }
          subscriptionOrder {
            id buyerEmail status billingPeriod currentPeriodStart currentPeriodEnd canceledAt
            subscriptionProduct { id name }
          }
        }
      }`,
      variables: { ref: sessionId },
    })) as WaffoGraphqlResult;

    if (result.errors?.length) {
      throw new Error(result.errors[0]?.message || 'Waffo order lookup failed');
    }

    const payment = result.data?.payments?.[0];
    if (!payment) return null;
    return this.buildPaymentSessionFromPayment(payment, sessionId);
  }

  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    const rawBody = await req.text();
    const signature = req.headers.get('x-waffo-signature');
    if (!rawBody || !signature)
      throw new Error('Invalid Waffo webhook request');

    const environment = this.configs.environment || 'prod';
    const event = verifyWebhook<WebhookEventData>(rawBody, signature, {
      environment: environment === 'test' ? Environment.Test : Environment.Prod,
      publicKey: this.configs.webhookPublicKey || undefined,
    }) as WebhookEvent<WebhookEventData>;

    if (this.configs.storeId && event.storeId !== this.configs.storeId) {
      throw new Error('Waffo webhook store does not match configured store');
    }

    const eventType = this.mapEventType(event.eventType);
    const paymentSession = await this.buildPaymentSessionFromWebhook(event);

    return {
      eventType,
      eventResult: event,
      paymentSession,
    };
  }

  async cancelSubscription({ subscriptionId }: { subscriptionId: string }) {
    if (!subscriptionId) throw new Error('subscriptionId is required');

    const result = await this.client.orders.cancelSubscription(
      { orderId: subscriptionId },
      { idempotencyKey: `shipany-cancel-${subscriptionId}` }
    );
    const status =
      result.status === 'canceling'
        ? SubscriptionStatus.PENDING_CANCEL
        : SubscriptionStatus.CANCELED;

    return {
      provider: this.name,
      paymentStatus: PaymentStatus.SUCCESS,
      paymentResult: result,
      subscriptionId,
      subscriptionInfo: {
        subscriptionId,
        status,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        canceledAt: new Date(),
        canceledReason: 'Canceled by user',
        canceledReasonType: 'user_request',
      },
      metadata: {},
    };
  }

  private mapEventType(eventType: string): PaymentEventType {
    switch (eventType) {
      case WebhookEventType.OrderCompleted:
      case WebhookEventType.SubscriptionActivated:
        return PaymentEventType.CHECKOUT_SUCCESS;
      case WebhookEventType.SubscriptionPaymentSucceeded:
      case WebhookEventType.SubscriptionRenewed:
      case WebhookEventType.SubscriptionRecovered:
        return PaymentEventType.PAYMENT_SUCCESS;
      case WebhookEventType.SubscriptionCanceling:
      case WebhookEventType.SubscriptionUncanceled:
      case WebhookEventType.SubscriptionPlanChanged:
      case WebhookEventType.SubscriptionPlanChangeScheduled:
      case WebhookEventType.SubscriptionPlanChangeFailed:
      case WebhookEventType.SubscriptionPastDue:
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case WebhookEventType.SubscriptionCanceled:
        return PaymentEventType.SUBSCRIBE_CANCELED;
      default:
        throw new WebhookIgnoredError(
          `No handler for Waffo event: ${eventType}`
        );
    }
  }

  private async buildPaymentSessionFromWebhook(
    event: WebhookEvent<WebhookEventData>
  ): Promise<PaymentSession> {
    const data = event.data;
    const isSubscription = event.eventType.startsWith('subscription.');
    const currency = data.currency || 'USD';
    const amount = data.chargedAmount || data.amount || data.total || '0';
    const externalOrderId = data.orderMerchantExternalId || '';
    const paymentStatus =
      event.eventType === WebhookEventType.SubscriptionCanceling ||
      event.eventType === WebhookEventType.SubscriptionUncanceled ||
      event.eventType === WebhookEventType.SubscriptionCanceled ||
      event.eventType === WebhookEventType.SubscriptionPastDue
        ? PaymentStatus.PROCESSING
        : PaymentStatus.SUCCESS;

    const session: PaymentSession = {
      provider: this.name,
      paymentStatus,
      paymentInfo: {
        transactionId: data.paymentId || event.eventId,
        amount: toMinorUnits(amount, currency),
        currency,
        paymentAmount: toMinorUnits(amount, currency),
        paymentCurrency: currency,
        paymentEmail: data.buyerEmail,
        paymentUserId: data.merchantProvidedBuyerIdentity,
        paidAt: toDate(data.paymentDate) || toDate(event.timestamp),
      },
      paymentResult: {
        id: externalOrderId || data.orderId || event.eventId,
        orderId: data.orderId,
        eventId: event.eventId,
        eventType: event.eventType,
        data,
      },
      metadata: {
        ...(data.orderMetadata || {}),
        orderMerchantExternalId: externalOrderId,
      },
    };

    if (isSubscription) {
      session.subscriptionId = data.orderId;
      // `subscription.payment_succeeded` deliberately carries no period
      // fields. Prefer the richer `subscription.renewed` event for renewal
      // grants, while still enriching this event when the GraphQL lookup is
      // available.
      if (
        event.eventType === WebhookEventType.SubscriptionPaymentSucceeded &&
        !data.currentPeriodStart &&
        !data.currentPeriodEnd
      ) {
        const enriched = await this.getPaymentSession({
          sessionId: externalOrderId || data.orderId,
        });
        session.subscriptionInfo = enriched?.subscriptionInfo;
        session.subscriptionResult = enriched?.subscriptionResult || data;
      } else {
        session.subscriptionInfo = this.buildSubscriptionInfo({
          subscriptionId: data.orderId,
          productId: undefined,
          description: data.productName,
          amount: data.planPrice?.total || amount,
          currency,
          interval: data.billingPeriod,
          status: data.orderStatus,
          currentPeriodStart: data.currentPeriodStart,
          currentPeriodEnd: data.currentPeriodEnd,
          canceledAt: data.canceledAt,
        });
        session.subscriptionResult = data;
      }
    }

    return session;
  }

  private buildPaymentSessionFromPayment(
    payment: WaffoGraphqlPayment,
    externalOrderId: string
  ): PaymentSession {
    const subscription = payment.subscriptionOrder;
    const oneTime = payment.onetimeOrder;
    const source = subscription || oneTime;
    const currency =
      payment.snapshotAmountDetails?.currency?.toUpperCase() || 'USD';
    const amount = payment.snapshotAmountDetails?.total || '0';
    const session: PaymentSession = {
      provider: this.name,
      paymentStatus: mapPaymentStatus(payment.status || source?.status),
      paymentInfo: {
        transactionId: payment.id || payment.orderId,
        amount: toMinorUnits(amount, currency),
        currency,
        paymentAmount: toMinorUnits(amount, currency),
        paymentCurrency: currency,
        paymentEmail: source?.buyerEmail,
        paidAt: toDate(payment.createdAt),
      },
      paymentResult: {
        id: externalOrderId,
        orderId: payment.orderId || source?.id,
        payment,
      },
      metadata: { orderMerchantExternalId: externalOrderId },
    };

    if (subscription) {
      session.subscriptionId = subscription.id;
      session.subscriptionInfo = this.buildSubscriptionInfo({
        subscriptionId: subscription.id,
        productId: subscription.subscriptionProduct?.id,
        description: subscription.subscriptionProduct?.name,
        amount,
        currency,
        interval: subscription.billingPeriod,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        canceledAt: subscription.canceledAt,
      });
      session.subscriptionResult = subscription;
    }

    return session;
  }

  private buildSubscriptionInfo(input: {
    subscriptionId?: string;
    productId?: string;
    description?: string;
    amount?: string;
    currency: string;
    interval?: string;
    status?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    canceledAt?: string;
  }): SubscriptionInfo {
    const currentPeriodStart = toDate(input.currentPeriodStart) || new Date();
    const currentPeriodEnd =
      toDate(input.currentPeriodEnd) || currentPeriodStart;
    return {
      subscriptionId: input.subscriptionId || '',
      productId: input.productId,
      description: input.description,
      amount: toMinorUnits(input.amount || '0', input.currency),
      currency: input.currency,
      interval: mapInterval(input.interval),
      intervalCount: input.interval === BillingPeriod.Quarterly ? 3 : 1,
      currentPeriodStart,
      currentPeriodEnd,
      billingUrl: 'https://pancake.waffo.ai/consumer/portal/login',
      status: mapSubscriptionStatus(input.status),
      canceledAt: toDate(input.canceledAt),
      canceledEndAt:
        input.status === 'canceling' ? currentPeriodEnd : undefined,
    };
  }
}
