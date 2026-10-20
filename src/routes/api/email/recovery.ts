import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import {
  recordRecoveryClick,
  unsubscribeRecoveryEmails,
  verifyRecoveryToken,
} from '@/modules/payment-recovery/service';

// Links from the unpaid-checkout reminder (modules/payment-recovery):
// - click: log it, then send the user to pricing to finish paying.
// - unsub: GET shows a confirm button (mail scanners prefetch GET links, so a
//   GET alone never unsubscribes); POST unsubscribes, which also serves the
//   RFC 8058 one-click `List-Unsubscribe-Post` request from mail clients.

function siteUrl() {
  return (envConfigs.app_url || '').replace(/\/$/, '');
}

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:28rem;margin:15vh auto;padding:0 1rem;color:#111;text-align:center}button{font:inherit;padding:.6rem 1.4rem;border-radius:.5rem;border:0;background:#111;color:#fff;cursor:pointer}a{color:inherit}</style></head><body>${body}</body></html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

const invalid = () =>
  page(
    'Link expired',
    `<h1>This link is not valid</h1><p><a href="${siteUrl()}/">Back to the site</a></p>`,
    400
  );

async function GET({ request }: { request: Request }) {
  const raw = new URL(request.url).searchParams.get('t');
  const token = await verifyRecoveryToken(raw);
  if (!token) return invalid();

  if (token.action === 'click') {
    await recordRecoveryClick(token.userId, token.orderNo).catch((error) =>
      console.error('[payment-recovery] click log failed:', error)
    );
    return Response.redirect(
      `${siteUrl()}/pricing?utm_source=recovery_email`,
      302
    );
  }

  return page(
    'Unsubscribe',
    `<h1>Unsubscribe from checkout reminders?</h1><form method="post"><input type="hidden" name="t" value="${encodeURIComponent(raw!)}"><button type="submit">Unsubscribe</button></form>`
  );
}

async function POST({ request }: { request: Request }) {
  // One-click clients POST to the List-Unsubscribe URL (token in the query);
  // the confirm form posts the token in the body.
  const url = new URL(request.url);
  let raw = url.searchParams.get('t');
  if (!raw) {
    const form = await request.formData().catch(() => null);
    const value = form?.get('t');
    raw = typeof value === 'string' ? decodeURIComponent(value) : null;
  }
  const token = await verifyRecoveryToken(raw);
  if (!token || token.action !== 'unsub') return invalid();
  await unsubscribeRecoveryEmails(token.userId, token.orderNo);
  return page(
    'Unsubscribed',
    `<h1>You're unsubscribed</h1><p>You won't get checkout reminders anymore.</p><p><a href="${siteUrl()}/">Back to the site</a></p>`
  );
}

export const Route = createFileRoute('/api/email/recovery')({
  server: { handlers: { GET, POST } },
});
