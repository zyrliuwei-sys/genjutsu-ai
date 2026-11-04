const RETURN_PARAM = 'checkout_return';

export type CheckoutReturnTarget = 'pricing' | 'genjutsu' | 'text-video';

export function checkoutReturnTarget(url: URL): CheckoutReturnTarget | null {
  const target = url.searchParams.get(RETURN_PARAM);
  return target === 'pricing' ||
    target === 'genjutsu' ||
    target === 'text-video'
    ? target
    : null;
}

export function withoutCheckoutReturn(path: string): string {
  const url = new URL(path, 'https://checkout.invalid');
  url.searchParams.delete(RETURN_PARAM);
  return url.pathname + url.search + url.hash;
}

export function checkoutReturnPath(
  path: string,
  target: CheckoutReturnTarget
): string {
  const url = new URL(path, 'https://checkout.invalid');
  url.searchParams.set(RETURN_PARAM, target);
  if (target === 'pricing') url.hash = 'pricing';
  return url.pathname + url.search + url.hash;
}

function sameOriginUrl(input: unknown, fallback: string, baseUrl: string): URL {
  const app = new URL(baseUrl);
  const fallbackUrl = new URL(fallback, app);
  if (typeof input !== 'string' || !input) return fallbackUrl;
  try {
    const candidate = new URL(input, app);
    return candidate.origin === app.origin ? candidate : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

/** Success and cancellation have distinct destinations; neither may leave the site. */
export function paymentReturnUrls(
  baseUrl: string,
  redirect: unknown,
  cancelRedirect: unknown
) {
  const success = sameOriginUrl(redirect, '/settings/billing', baseUrl);
  success.searchParams.delete(RETURN_PARAM);
  const callback = new URL('/api/payment/callback', baseUrl);
  callback.searchParams.set('redirect', success.href);
  return {
    successUrl: callback.href,
    cancelUrl: sameOriginUrl(cancelRedirect, '/pricing', baseUrl).href,
  };
}
