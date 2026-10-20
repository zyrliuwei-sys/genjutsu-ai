import { definePlugin } from 'nitro';

import { getAllConfigs } from '@/modules/config/service';
import { sendPaymentRecoveryEmails } from '@/modules/payment-recovery/service';

import { refreshInflightGenjutsu } from '../routes/api/studio/-shared';

/**
 * Cloudflare cron trigger (wrangler.jsonc `triggers.crons`): advance Genjutsu
 * runs in the background — resubmit retryable failures, fail and refund stuck
 * runs — without waiting for the customer to reopen the page — and email
 * unpaid-checkout reminders.
 */
export default definePlugin((nitroApp) => {
  (nitroApp.hooks as any).hook(
    'cloudflare:scheduled',
    async ({ env }: { env: unknown }) => {
      (globalThis as any).__CF_ENV__ ??= env;
      const configs = await getAllConfigs();
      const count = await refreshInflightGenjutsu(configs);
      if (count) console.log('[genjutsu] cron refreshed runs', count);
      try {
        const sent = await sendPaymentRecoveryEmails(configs);
        if (sent) console.log('[payment-recovery] reminders sent', sent);
      } catch (error) {
        console.error('[payment-recovery] cron failed:', error);
      }
    }
  );
});
