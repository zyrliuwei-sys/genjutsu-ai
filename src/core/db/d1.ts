import { drizzle } from 'drizzle-orm/d1';

import { createD1HttpDb, runD1HttpAtomicBatch } from './d1-http';

// Minimal D1Database type to avoid pulling in @cloudflare/workers-types globally
type D1Database = {
  prepare(query: string): any;
  batch(statements: any[]): Promise<any[]>;
  exec(query: string): Promise<any>;
  dump(): Promise<ArrayBuffer>;
};

// D1 singleton instance
let d1DbInstance: any = null;

/**
 * Resolve the D1 binding named `DB` (see wrangler.jsonc `d1_databases`).
 *
 * On Cloudflare Workers the binding env is stashed on `globalThis.__CF_ENV__`
 * by the server entry (src/server.ts, via `cloudflare:workers`). Nitro's
 * cloudflare presets also expose it as `globalThis.__env__` — check both.
 */
function findD1Binding(): D1Database | undefined {
  const g = globalThis as any;
  const env = g.__CF_ENV__ ?? g.__env__;
  return env?.DB;
}

function getD1Binding(): D1Database {
  const binding = findD1Binding();
  if (!binding) {
    throw new Error(
      'D1 binding "DB" not found. DATABASE_PROVIDER=d1 only works on Cloudflare Workers ' +
        'with a d1_databases binding named "DB" in wrangler.jsonc.'
    );
  }
  return binding as D1Database;
}

/** D1 transactions are batch-only. Never emulate financial writes sequentially. */
export async function runD1AtomicBatch(
  queries: { toSQL(): { sql: string; params: unknown[] } }[]
) {
  if (
    !findD1Binding() &&
    typeof process !== 'undefined' &&
    process.env.D1_REMOTE_HTTP === 'true'
  ) {
    return runD1HttpAtomicBatch(queries.map((query) => query.toSQL()));
  }
  const binding = getD1Binding();
  return binding.batch(
    queries.map((query) => {
      const { sql, params } = query.toSQL();
      return binding.prepare(sql).bind(...params);
    })
  );
}

export function createD1Db() {
  if (d1DbInstance) return d1DbInstance;

  // Local dev (Node): no Workers binding — reach the same production D1
  // over the HTTP API when D1_REMOTE_HTTP=true (see d1-http.ts).
  if (
    !findD1Binding() &&
    typeof process !== 'undefined' &&
    process.env?.D1_REMOTE_HTTP === 'true'
  ) {
    d1DbInstance = createD1HttpDb();
    return d1DbInstance;
  }

  const binding = getD1Binding();
  d1DbInstance = drizzle(binding);
  return d1DbInstance;
}
