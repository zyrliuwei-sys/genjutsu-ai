import handler from '@tanstack/react-start/server-entry';

import { getCookieFromHeader } from './lib/cookie';
import { paraglideMiddleware } from './paraglide/server.js';

// On Cloudflare Workers, stash the binding env (D1, ASSETS, …) on globalThis
// so synchronous code paths (e.g. the db() singleton with DATABASE_PROVIDER=d1)
// can reach bindings without threading the request context through every call.
// The specifier is kept non-literal so bundlers leave the import to runtime;
// outside workerd the import rejects and we just move on.
const CF_WORKERS_MODULE = 'cloudflare:workers';
let cfEnvPromise: Promise<void> | null = null;

function ensureCloudflareEnv(): Promise<void> {
  if (!cfEnvPromise) {
    cfEnvPromise = import(/* @vite-ignore */ CF_WORKERS_MODULE)
      .then((mod) => {
        (globalThis as any).__CF_ENV__ = mod.env;
      })
      .catch(() => {
        // Not running on Cloudflare Workers — nothing to stash.
      });
  }
  return cfEnvPromise;
}

// Custom server entry — wraps every request in Paraglide's middleware so
// getLocale() resolves per-request (AsyncLocalStorage) during SSR.
export default {
  async fetch(req: Request): Promise<Response> {
    await ensureCloudflareEnv();
    // Route handlers may receive a re-wrapped Request without `cf`; carry the
    // edge country as the standard header (used for free-preview eligibility).
    // `cf` is set by the edge, so it always overrides a client-sent header.
    const edgeCountry = (req as any).cf?.country;
    if (
      edgeCountry &&
      req.headers.get('cf-ipcountry') !== String(edgeCountry)
    ) {
      const headers = new Headers(req.headers);
      headers.set('cf-ipcountry', String(edgeCountry));
      req = new Request(req, { headers });
    }
    // English-only site: permanently redirect legacy /zh URLs to their English path.
    const reqUrl = new URL(req.url);
    if (reqUrl.pathname === '/zh' || reqUrl.pathname.startsWith('/zh/')) {
      reqUrl.pathname = reqUrl.pathname.slice(3) || '/';
      return Response.redirect(reqUrl.toString(), 301);
    }
    const response = await paraglideMiddleware(req, () => handler.fetch(req));
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()'
    );
    const utmSource = new URL(req.url).searchParams.get('utm_source');
    const existing = getCookieFromHeader(
      req.headers.get('cookie'),
      'utm_source'
    );
    if (utmSource && !existing) {
      const sanitized = utmSource.replace(/[^\w.\-]/g, '').slice(0, 100);
      if (sanitized) {
        response.headers.append(
          'Set-Cookie',
          `utm_source=${sanitized}; Max-Age=2592000; Path=/; SameSite=Lax${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`
        );
      }
    }
    return response;
  },
};
