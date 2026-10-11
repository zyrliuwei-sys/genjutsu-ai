import { createFileRoute } from '@tanstack/react-router';

import { EvolinkProvider } from '@/core/ai';
import { getAuth } from '@/core/auth';
import { envConfigs } from '@/config';
import { GENJUTSU_REFERENCES, isGenjutsuAspect } from '@/config/genjutsu';
import {
  buildPreviewPrompt,
  GENJUTSU_PREVIEW_DEFAULT_DAILY_CAP,
  GENJUTSU_PREVIEW_MODEL,
  GENJUTSU_PREVIEW_PER_IP,
  isPreviewCountry,
} from '@/config/genjutsu-preview';
import { getAllConfigs } from '@/modules/config/service';
import {
  claimPreview,
  countIpPreviews,
  countRecentPreviews,
  findUserPreview,
  hasGoogleAccount,
  updatePreview,
} from '@/modules/genjutsu-preview/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

import { archive } from '../studio/-shared';

/**
 * Free still preview (one per account, lifetime) for eligible countries,
 * Google-signed-in accounts only (email/password sign-ups don't qualify).
 * GET  → { eligible, preview } — also advances a processing preview.
 * POST → { leadImage, frameImage, aspect, templateId? } starts the preview.
 */

const STUCK_AFTER_MS = 10 * 60 * 1000;

// Set by Cloudflare's edge; clients can't spoof it.
function requestCountry(request: Request) {
  const country =
    (request as any).cf?.country || request.headers.get('cf-ipcountry');
  if (country) return String(country).toUpperCase();
  return import.meta.env.DEV ? 'US' : '';
}

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

function enabled(configs: Record<string, string>) {
  return (
    configs.genjutsu_preview_enabled !== 'false' &&
    Boolean(configs.evolink_api_key)
  );
}

function dailyCap(configs: Record<string, string>) {
  const value = Number(configs.genjutsu_preview_daily_cap);
  return configs.genjutsu_preview_daily_cap && Number.isFinite(value)
    ? value
    : GENJUTSU_PREVIEW_DEFAULT_DAILY_CAP;
}

type PreviewView = { status: string; url: string | null; aspect: string };

function view(row: { status: string; url: string | null; aspect: string }) {
  return { status: row.status, url: row.url, aspect: row.aspect };
}

async function advance(
  row: NonNullable<Awaited<ReturnType<typeof findUserPreview>>>,
  configs: Record<string, string>
): Promise<PreviewView> {
  if (row.status !== 'processing') return view(row);
  const stuck = Date.now() - new Date(row.createdAt).getTime() > STUCK_AFTER_MS;
  if (!row.taskId) {
    if (!stuck) return view(row);
    await updatePreview(row.id, { status: 'failed' });
    return { ...view(row), status: 'failed' };
  }
  try {
    const task = await new EvolinkProvider({
      apiKey: configs.evolink_api_key,
      baseUrl: configs.evolink_base_url,
    }).getTask(row.taskId);
    if (
      task.status === 'failed' ||
      (task.status === 'completed' && !task.url)
    ) {
      await updatePreview(row.id, { status: 'failed' });
      return { ...view(row), status: 'failed' };
    }
    if (task.status === 'completed' && task.url) {
      const url = await archive(
        task.url,
        `previews/genjutsu/${row.id}.jpg`,
        'image/jpeg'
      );
      await updatePreview(row.id, { status: 'success', url });
      return { ...view(row), status: 'success', url };
    }
  } catch {
    // Transient provider error — keep polling until the task looks stuck.
  }
  if (stuck) {
    await updatePreview(row.id, { status: 'failed' });
    return { ...view(row), status: 'failed' };
  }
  return view(row);
}

async function GET({ request }: { request: Request }) {
  try {
    const configs = await getAllConfigs();
    const countryOk =
      isPreviewCountry(requestCountry(request)) && enabled(configs);
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    // Signed out: offer it in eligible countries; claiming requires Google.
    if (!session?.user) return respData({ eligible: countryOk, preview: null });
    const row = await findUserPreview(session.user.id);
    const preview = row ? await advance(row, configs) : null;
    return respData({
      eligible:
        countryOk &&
        (!preview || preview.status === 'failed') &&
        (await hasGoogleAccount(session.user.id)),
      preview,
    });
  } catch {
    return respErr('Unable to check preview');
  }
}

function isUploaded(value: unknown, origin: string) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.origin === origin;
  } catch {
    return false;
  }
}

async function POST({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized');
    const configs = await getAllConfigs();
    const country = requestCountry(request);
    if (!enabled(configs) || !isPreviewCountry(country))
      return respErr('PREVIEW_UNAVAILABLE');
    if (!(await hasGoogleAccount(session.user.id)))
      return respErr('PREVIEW_GOOGLE_ONLY');

    const limited = enforceMinIntervalRateLimit(request, {
      intervalMs: 5000,
      keyPrefix: 'genjutsu-preview',
      extraKey: session.user.id,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    if (!isGenjutsuAspect(body?.aspect)) return respErr('Invalid video size');
    if (!configs.r2_domain) return respErr('PREVIEW_UNAVAILABLE');
    const origin = new URL(configs.r2_domain).origin;
    if (
      !isUploaded(body?.leadImage, origin) ||
      !isUploaded(body?.frameImage, origin)
    )
      return respErr('Use media uploaded through this generator');

    const ipHash = await hashIp(clientIp(request));
    const existing = await findUserPreview(session.user.id);
    if (existing && existing.status !== 'failed')
      return respErr('PREVIEW_USED');
    if ((await countIpPreviews(ipHash)) >= GENJUTSU_PREVIEW_PER_IP)
      return respErr('PREVIEW_USED');
    if ((await countRecentPreviews()) >= dailyCap(configs))
      return respErr('PREVIEW_BUSY');

    const row = await claimPreview({
      userId: session.user.id,
      ipHash,
      country,
      aspect: body.aspect,
    });
    if (!row) return respErr('PREVIEW_USED');

    const reference =
      typeof body?.templateId === 'string' &&
      Object.hasOwn(GENJUTSU_REFERENCES, body.templateId)
        ? GENJUTSU_REFERENCES[body.templateId]
        : undefined;
    try {
      const taskId = await new EvolinkProvider({
        apiKey: configs.evolink_api_key,
        baseUrl: configs.evolink_base_url,
      }).createImage({
        model: GENJUTSU_PREVIEW_MODEL,
        prompt: buildPreviewPrompt(reference?.direction),
        image_urls: [body.leadImage, body.frameImage],
        size: body.aspect,
        quality: '1K',
        output_format: 'jpeg',
      });
      await updatePreview(row.id, { taskId });
    } catch (error) {
      console.error('[genjutsu-preview] provider error', error);
      await updatePreview(row.id, { status: 'failed' });
      return respErr('PREVIEW_FAILED');
    }
    return respData({ preview: view(row) });
  } catch (error: any) {
    return respErr(error?.message || 'Preview failed');
  }
}

export const Route = createFileRoute('/api/genjutsu/preview')({
  server: { handlers: { GET, POST } },
});
