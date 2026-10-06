import { createFileRoute } from '@tanstack/react-router';

import { EvolinkProvider } from '@/core/ai';
import { envConfigs } from '@/config';
import { normalizeStudioOptions } from '@/config/studio-models';
import { getAllConfigs } from '@/modules/config/service';
import {
  createPreview,
  findPreview,
  getPreviewQuota,
  PREVIEW_DEFAULT_DAILY_CAP,
  updatePreview,
} from '@/modules/preview/service';
import { respData, respErr } from '@/lib/resp';

import { archive } from './-shared';

/**
 * Free low-res still preview — no sign-in, no credits. GPT Image 2 at "low"
 * quality costs ~$0.005 on Evolink; per-IP and site-wide daily caps bound the
 * spend. Video stays behind sign-in + credits.
 */

const MAX_PROMPT = 1000;
const STUCK_AFTER_MS = 15 * 60 * 1000;

// Behind Cloudflare, cf-connecting-ip is set by the edge and can't be spoofed
// (x-forwarded-for can), so it wins.
function clientIp(request: Request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

async function hashIp(ip: string) {
  const data = new TextEncoder().encode(`${envConfigs.auth_secret}|${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function dailyCap(configs: Record<string, string>) {
  const value = Number(configs.preview_daily_cap);
  return Number.isFinite(value) && value >= 0
    ? value
    : PREVIEW_DEFAULT_DAILY_CAP;
}

function view(row: { id: string; status: string; url: string | null }) {
  return { id: row.id, status: row.status, url: row.url };
}

// Remaining free previews for this visitor.
async function quota(request: Request) {
  const configs = await getAllConfigs();
  const result = await getPreviewQuota(
    await hashIp(clientIp(request)),
    dailyCap(configs)
  );
  return respData(result);
}

async function GET({ request }: { request: Request }) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return quota(request);

    const row = await findPreview(id);
    if (!row) return respErr('Preview not found');
    if (row.status !== 'processing' || !row.taskId) return respData(view(row));

    const configs = await getAllConfigs();
    const provider = new EvolinkProvider({
      apiKey: configs.evolink_api_key,
      baseUrl: configs.evolink_base_url,
    });
    try {
      const task = await provider.getTask(row.taskId);
      if (
        task.status === 'failed' ||
        (task.status === 'completed' && !task.url)
      ) {
        await updatePreview(row.id, { status: 'failed' });
        return respData({ ...view(row), status: 'failed' });
      }
      if (task.status === 'completed' && task.url) {
        const url = await archive(
          task.url,
          `previews/${row.id}.png`,
          'image/png'
        );
        await updatePreview(row.id, { status: 'success', url });
        return respData({ ...view(row), status: 'success', url });
      }
    } catch {
      // Transient provider error — keep polling until the task looks stuck.
      if (Date.now() - new Date(row.createdAt).getTime() > STUCK_AFTER_MS) {
        await updatePreview(row.id, { status: 'failed' });
        return respData({ ...view(row), status: 'failed' });
      }
    }
    return respData(view(row));
  } catch (error: any) {
    return respErr(error?.message || 'Query failed');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json().catch(() => ({}));
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return respErr('Prompt is required');
    if (prompt.length > MAX_PROMPT) return respErr('Prompt is too long');
    const { aspect } = normalizeStudioOptions(body);
    const kind = body?.kind === 'image' ? 'image' : 'video';

    const configs = await getAllConfigs();
    if (!configs.evolink_api_key) return respErr('Preview is not configured');

    const ipHash = await hashIp(clientIp(request));
    const { remaining, siteCapReached } = await getPreviewQuota(
      ipHash,
      dailyCap(configs)
    );
    if (remaining <= 0) return respErr('PREVIEW_LIMIT');
    if (siteCapReached) return respErr('PREVIEW_BUSY');

    const row = await createPreview({ ipHash, prompt, aspect });
    try {
      const taskId = await new EvolinkProvider({
        apiKey: configs.evolink_api_key,
        baseUrl: configs.evolink_base_url,
      }).createImage({
        model: 'gpt-image-2',
        // A video prompt describes motion; ask for its opening frame.
        prompt:
          kind === 'video'
            ? `Opening frame of a cinematic video, as a single still image. ${prompt}`
            : prompt,
        size: aspect,
        quality: 'low',
        n: 1,
      });
      await updatePreview(row.id, { taskId });
    } catch (error) {
      await updatePreview(row.id, { status: 'failed' });
      throw error;
    }

    return respData({ ...view(row), remaining: remaining - 1 });
  } catch (error: any) {
    return respErr(error?.message || 'Preview failed');
  }
}

export const Route = createFileRoute('/api/studio/preview')({
  server: { handlers: { GET, POST } },
});
