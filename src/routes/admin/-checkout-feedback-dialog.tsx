import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { tDynamic } from '@/core/i18n/dynamic';
import { apiGet, apiPost } from '@/lib/api-client';
import { formatDateTime } from '@/lib/time';
import { m } from '@/paraglide/messages.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Candidate {
  userId: string;
  email: string;
  name: string | null;
  orderNo: string;
  amount: number;
  currency: string;
  plan: string | null;
  orderCreatedAt: string;
  unpaidOrders: number;
  reminderSentAt: string | null;
  feedbackSentAt: string | null;
  reply: { reason: string; note?: string; at: string } | null;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount / 100);
}

/** Lists users who never paid and emails the picked ones "what stopped you?". */
export function CheckoutFeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['admin-checkout-feedback'],
    queryFn: () => apiGet<Candidate[]>('/api/admin/checkout-feedback'),
    enabled: open,
  });
  const rows = query.data ?? [];
  const askable = rows.filter((r) => !r.feedbackSentAt);

  // Preselect everyone not asked yet each time fresh data arrives.
  useEffect(() => {
    if (query.data)
      setSelected(
        new Set(
          query.data.filter((r) => !r.feedbackSentAt).map((r) => r.userId)
        )
      );
  }, [query.data]);

  const sendMutation = useMutation({
    mutationFn: (userIds: string[]) =>
      apiPost<{ sent: number; skipped: number; failed: string[] }>(
        '/api/admin/checkout-feedback',
        { userIds }
      ),
    onSuccess: (result) => {
      toast.success(
        m['admin.checkout_feedback.sent']({
          sent: result.sent,
          failed: result.failed.length,
        })
      );
      queryClient.invalidateQueries({ queryKey: ['admin-checkout-feedback'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggle(userId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }

  const allChecked =
    askable.length > 0 && askable.every((r) => selected.has(r.userId));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!sendMutation.isPending) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{m['admin.checkout_feedback.title']()}</DialogTitle>
          <DialogDescription>
            {m['admin.checkout_feedback.description']()}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-muted-foreground text-left">
                <th className="w-10 p-2">
                  <Checkbox
                    checked={allChecked}
                    disabled={!askable.length}
                    onCheckedChange={(checked) =>
                      setSelected(
                        checked
                          ? new Set(askable.map((r) => r.userId))
                          : new Set()
                      )
                    }
                  />
                </th>
                <th className="p-2 font-medium">
                  {m['admin.checkout_feedback.col_user']()}
                </th>
                <th className="p-2 font-medium">
                  {m['admin.checkout_feedback.col_order']()}
                </th>
                <th className="p-2 font-medium">
                  {m['admin.checkout_feedback.col_reminder']()}
                </th>
                <th className="p-2 font-medium">
                  {m['admin.checkout_feedback.col_asked']()}
                </th>
                <th className="p-2 font-medium">
                  {m['admin.checkout_feedback.col_reply']()}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-t align-top">
                  <td className="p-2">
                    <Checkbox
                      checked={selected.has(r.userId)}
                      disabled={!!r.feedbackSentAt}
                      onCheckedChange={(checked) => toggle(r.userId, checked)}
                    />
                  </td>
                  <td className="p-2">
                    <div className="break-all">{r.email}</div>
                    {r.name ? (
                      <div className="text-muted-foreground text-xs">
                        {r.name}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <div>
                      {formatAmount(r.amount, r.currency)}
                      {r.unpaidOrders > 1 ? (
                        <span className="text-muted-foreground">
                          {' '}
                          ×{r.unpaidOrders}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {formatDateTime(r.orderCreatedAt)}
                    </div>
                  </td>
                  <td className="text-muted-foreground p-2 text-xs whitespace-nowrap">
                    {r.reminderSentAt ? formatDateTime(r.reminderSentAt) : '—'}
                  </td>
                  <td className="text-muted-foreground p-2 text-xs whitespace-nowrap">
                    {r.feedbackSentAt ? formatDateTime(r.feedbackSentAt) : '—'}
                  </td>
                  <td className="p-2">
                    {r.reply ? (
                      <div className="space-y-1">
                        <Badge>
                          {tDynamic(
                            `admin.checkout_feedback.reason_${r.reply.reason}`
                          )}
                        </Badge>
                        {r.reply.note ? (
                          <div className="text-xs break-words">
                            {r.reply.note}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-muted-foreground p-6 text-center"
                  >
                    {query.isFetching
                      ? m['admin.checkout_feedback.loading']()
                      : m['admin.checkout_feedback.empty']()}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={sendMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            {m['admin.payments.cancel']()}
          </Button>
          <Button
            disabled={!selected.size || sendMutation.isPending}
            onClick={() => sendMutation.mutate([...selected])}
          >
            {sendMutation.isPending
              ? m['admin.checkout_feedback.sending']()
              : m['admin.checkout_feedback.send']({ count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
