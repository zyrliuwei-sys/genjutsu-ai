import { definePlugin } from 'nitro';

import { getAllConfigs } from '@/modules/config/service';

import { refreshInflightGenjutsu } from '../routes/api/studio/-shared';

/**
 * Cloudflare cron trigger (wrangler.jsonc `triggers.crons`): advance Genjutsu
 * runs in the background — resubmit retryable failures, fail and refund stuck
 * runs — without waiting for the customer to reopen the page.
 */
export default definePlugin((nitroApp) => {
  (nitroApp.hooks as any).hook(
    'cloudflare:scheduled',
    async ({ env }: { env: unknown }) => {
      (globalThis as any).__CF_ENV__ ??= env;
      const count = await refreshInflightGenjutsu(await getAllConfigs());
      if (count) console.log('[genjutsu] cron refreshed runs', count);
    }
  );
});
