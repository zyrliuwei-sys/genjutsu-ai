import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';

import { useSession } from '@/core/auth/client';
import { pricingCatalog } from '@/config/pricing';
import { apiGet, type PageResult } from '@/lib/api-client';
import { VIDEO_PACKS } from '@/lib/purchase-guidance';
import { useFunnel } from '@/hooks/use-funnel';

type ReturnedOrder = {
  orderNo: string;
  status: string;
  amount: number;
  currency: string;
  productName: string;
};
const reported = new Set<string>();
const refreshed = new Set<string>();

/** A redirect is NOT proof of payment. Only the authenticated server's paid
 * order record may emit purchase. No names, emails or checkout URLs are sent. */
export function PurchaseReturnObserver() {
  const { data: session } = useSession();
  const { track } = useFunnel();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [orderNo, setOrderNo] = useState<string>();
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get(
      'checkout_order'
    );
    setOrderNo(
      value && /^[A-Za-z0-9_-]{1,100}$/.test(value) ? value : undefined
    );
  }, [location.href]);
  const result = useQuery({
    queryKey: ['returned-payment', session?.user.id, orderNo],
    queryFn: () =>
      apiGet<PageResult<ReturnedOrder>>(
        `/api/user/orders?pageSize=1&search=${encodeURIComponent(orderNo!)}`
      ),
    enabled: Boolean(session?.user && orderNo),
    retry: false,
    refetchInterval: (query) => {
      const row = query.state.data?.items.find((x) => x.orderNo === orderNo);
      return row?.status === 'paid' ||
        query.state.dataUpdateCount >= 20 ||
        query.state.status === 'error'
        ? false
        : 3000;
    },
  });
  useEffect(() => {
    const row = result.data?.items.find((x) => x.orderNo === orderNo);
    if (!row || row.status !== 'paid') return;
    if (!refreshed.has(row.orderNo)) {
      refreshed.add(row.orderNo);
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
    }
    if (reported.has(row.orderNo)) return;
    try {
      if (sessionStorage.getItem(`purchase-reported:${row.orderNo}`)) return;
    } catch {
      /* Memory dedupe still works. */
    }
    const product = VIDEO_PACKS.find(
      (id) => pricingCatalog[id].productName === row.productName
    );
    if (!product || row.currency.toLowerCase() !== 'usd') return;
    if (
      track('purchase', {
        transaction_id: row.orderNo,
        product_id: product,
        value: row.amount / 100,
      })
    ) {
      reported.add(row.orderNo);
      try {
        sessionStorage.setItem(`purchase-reported:${row.orderNo}`, '1');
      } catch {
        /* Nonessential. */
      }
    }
  }, [result.data, orderNo, track, queryClient]);
  return null;
}
