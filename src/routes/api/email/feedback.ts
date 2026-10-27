import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import {
  FEEDBACK_REASONS,
  isFeedbackReason,
  recordCheckoutFeedback,
  verifyRecoveryToken,
} from '@/modules/payment-recovery/service';

// Answer links from the checkout-feedback email (modules/payment-recovery).
// GET only shows the form with the clicked answer preselected (mail scanners
// prefetch GET links, so a GET alone never records anything); POST records it.

function siteUrl() {
  return (envConfigs.app_url || '').replace(/\/$/, '');
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!
  );
}

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:28rem;margin:10vh auto;padding:0 1rem;color:#111}h1{font-size:1.4rem}label.opt{display:flex;gap:.6rem;align-items:center;padding:.7rem .9rem;margin:.5rem 0;border:1px solid #ddd;border-radius:.6rem;cursor:pointer}textarea{width:100%;box-sizing:border-box;font:inherit;padding:.6rem;border:1px solid #ddd;border-radius:.6rem;margin:.5rem 0 1rem}button{font:inherit;padding:.6rem 1.4rem;border-radius:.5rem;border:0;background:#111;color:#fff;cursor:pointer}a{color:inherit}.c{text-align:center}</style></head><body>${body}</body></html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

const invalid = () =>
  page(
    'Link expired',
    `<div class="c"><h1>This link is not valid</h1><p><a href="${siteUrl()}/">Back to the site</a></p></div>`,
    400
  );

async function GET({ request }: { request: Request }) {
  const params = new URL(request.url).searchParams;
  const raw = params.get('t');
  const token = await verifyRecoveryToken(raw);
  if (!token || token.action !== 'feedback') return invalid();

  const selected = params.get('r');
  const options = Object.entries(FEEDBACK_REASONS)
    .map(
      ([reason, text]) =>
        `<label class="opt"><input type="radio" name="reason" value="${reason}" required${
          reason === selected ? ' checked' : ''
        }> ${escapeHtml(text)}</label>`
    )
    .join('');

  return page(
    'What stopped you?',
    `<h1>What stopped you from finishing checkout?</h1><form method="post"><input type="hidden" name="t" value="${escapeHtml(
      raw!
    )}">${options}<p>Anything else you'd like to tell us? (optional)</p><textarea name="note" rows="4" maxlength="1000"></textarea><button type="submit">Send</button></form>`
  );
}

async function POST({ request }: { request: Request }) {
  const form = await request.formData().catch(() => null);
  const raw = form?.get('t');
  const token = await verifyRecoveryToken(raw);
  if (!token || token.action !== 'feedback') return invalid();

  const reason = form?.get('reason');
  const note = form?.get('note');
  if (!isFeedbackReason(reason)) return invalid();
  await recordCheckoutFeedback(
    token.userId,
    token.orderNo,
    reason,
    typeof note === 'string' ? note : ''
  );
  return page(
    'Thank you',
    `<div class="c"><h1>Thank you!</h1><p>Your answer really helps us make things better.</p><p><a href="${siteUrl()}/pricing?utm_source=feedback_email">Back to the site</a></p></div>`
  );
}

export const Route = createFileRoute('/api/email/feedback')({
  server: { handlers: { GET, POST } },
});
