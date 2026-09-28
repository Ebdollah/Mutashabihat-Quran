import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { neon, neonConfig, Pool as NeonPool } from '@neondatabase/serverless';
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNeonWs } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as PgPool } from 'pg';
import { env, requireDatabaseUrl } from '@/lib/env';
import { fetchWithConnectRetry } from '@/lib/net';
import * as schema from './schema';

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * One connection per process (kept on globalThis so dev hot-reload doesn't open new pools).
 * DB_DRIVER picks how we talk to Postgres:
 *   neon-http — Neon's HTTP driver. Best for serverless (Vercel). No interactive transactions.
 *   neon-ws   — Neon's WebSocket Pool. Supports transactions; keeps connections open.
 *   pg        — node-postgres, for a local or self-hosted Postgres (e.g. Docker).
 */
function create(): DB {
  const url = requireDatabaseUrl();
  const logger = env.DB_LOG_QUERIES;
  switch (env.DB_DRIVER) {
    case 'neon-ws':
      return drizzleNeonWs({ client: new NeonPool({ connectionString: url, max: env.DB_POOL_MAX }), schema, logger }) as unknown as DB;
    case 'pg':
      return drizzlePg({ client: new PgPool({ connectionString: url, max: env.DB_POOL_MAX }), schema, logger }) as unknown as DB;
    default:
      // Retry queries whose connection couldn't be opened (flaky or slow networks).
      neonConfig.fetchFunction = fetchWithConnectRetry;
      return drizzleNeonHttp({ client: neon(url), schema, logger }) as unknown as DB;
  }
}

const g = globalThis as unknown as { __db?: DB };

export function getDb(): DB {
  g.__db ??= create();
  return g.__db;
}

export { schema };
