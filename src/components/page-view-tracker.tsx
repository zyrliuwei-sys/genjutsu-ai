import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';

import { track } from '@/lib/track';

// Dashboards and auth screens are not acquisition pages; leave them out of
// the visitor count.
const SKIP =
  /^\/(admin|settings|api|sign-in|sign-up|auth-callback|forgot-password|reset-password|verify-email|redeem-invite)(\/|$)/;

/** Records a `page_view` funnel event on every public page navigation. */
export function PageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!SKIP.test(pathname)) track('page_view');
  }, [pathname]);

  return null;
}
