import { createFileRoute } from '@tanstack/react-router';

import { resolveDuetCredits } from '@/config/hotel-lobby-pricing';
import { getAllConfigs } from '@/modules/config/service';
import { respData, respErr } from '@/lib/resp';

// Public: credits one duet video costs (shown in the generator + pricing).
async function GET() {
  try {
    const configs = await getAllConfigs();
    return respData({ credits: resolveDuetCredits(configs) });
  } catch (error: any) {
    return respErr(error?.message || 'Internal error');
  }
}

export const Route = createFileRoute('/api/hotel-lobby/price')({
  server: { handlers: { GET } },
});
