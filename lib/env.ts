import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  // Where sets and users live. "json" = data/store.json (no DB needed), "db" = Postgres/Neon.
  STORAGE: z.enum(['json', 'db']).default('json'),
  JSON_STORE_PATH: z.string().default('data/store.json'),

  // Postgres driver: "neon-http" (default, serverless), "neon-ws" (WebSocket pool, full transactions),
  // "pg" (node-postgres, for a local/self-hosted Postgres).
  DB_DRIVER: z.enum(['neon-http', 'neon-ws', 'pg']).default('neon-http'),
  DATABASE_URL: z.string().optional(),
  DATABASE_URL_UNPOOLED: z.string().optional(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(5),
  DB_LOG_QUERIES: bool,

  QURAN_API_BASE: z.string().url().default('https://api.quran.com/api/v4'),
  QURAN_CACHE_SECONDS: z.coerce.number().int().nonnegative().default(60 * 60 * 24 * 30),

  ALLOW_SIGNUP: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
  SAMPLE_SETS_FOR_NEW_USERS: bool,
});

export const env = schema.parse(process.env);

export function requireDatabaseUrl(): string {
  if (!env.DATABASE_URL) {
    throw new Error('STORAGE=db needs DATABASE_URL. Add it to .env.local (see .env.example).');
  }
  return env.DATABASE_URL;
}
