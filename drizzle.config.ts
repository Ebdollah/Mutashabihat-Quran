import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { configureNetwork } from './lib/net';

config({ path: '.env.local', quiet: true });
config({ quiet: true });
configureNetwork();

// Migrations use the direct (unpooled) connection when available; Neon's pooler doesn't suit DDL well.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: url ?? 'postgres://missing-DATABASE_URL' },
  strict: true,
  verbose: true,
});
