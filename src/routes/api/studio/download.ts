import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import { getDownload } from '@/modules/media-download/service';
import { respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const id = new URL(request.url).searchParams.get('id');
    if (!id || id.length > 100)
      return respErr('Invalid task ID', { status: 400 });
    const configs = await getAllConfigs();
    const file = await getDownload(session.user.id, id, configs.r2_domain);
    // Binary success response, JSON error envelopes follow the API convention.
    return new Response(file.body, {
      headers: {
        'Content-Type': file.type,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Download unavailable',
      { status: 503 }
    );
  }
}

export const Route = createFileRoute('/api/studio/download')({
  server: { handlers: { GET } },
});
