import { useEffect, useRef } from 'react';

import {
  checkoutReturnTarget,
  withoutCheckoutReturn,
  type CheckoutReturnTarget,
} from '@/lib/checkout-return';

/** Restore a purchase surface after a cold navigation or a mobile bfcache return. */
export function useCheckoutReturn(
  target: CheckoutReturnTarget,
  onReturn: () => void,
  enabled = true
) {
  const callback = useRef(onReturn);
  callback.current = onReturn;

  useEffect(() => {
    if (!enabled) return;
    const restore = () => {
      const url = new URL(window.location.href);
      if (checkoutReturnTarget(url) !== target) return;
      // Consume the marker once, retaining the router's history state. Closing
      // the panel or refocusing the tab must not reopen it repeatedly.
      window.history.replaceState(
        window.history.state,
        '',
        withoutCheckoutReturn(url.href)
      );
      callback.current();
    };
    restore();
    window.addEventListener('pageshow', restore);
    window.addEventListener('popstate', restore);
    return () => {
      window.removeEventListener('pageshow', restore);
      window.removeEventListener('popstate', restore);
    };
  }, [target, enabled]);
}
