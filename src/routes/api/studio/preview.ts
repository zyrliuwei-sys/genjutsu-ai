import { createFileRoute } from '@tanstack/react-router';

import { respErr } from '@/lib/resp';

/**
 * Free experience is provided by the static examples on the landing page.
 * Keep this legacy route explicit so old clients cannot start an AI preview.
 */
async function unavailable() {
  return respErr('Preview is not available');
}

export const Route = createFileRoute('/api/studio/preview')({
  server: { handlers: { GET: unavailable, POST: unavailable } },
});
