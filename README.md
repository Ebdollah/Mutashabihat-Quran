# Mutashabihat

Track and compare **mutashabihat**, the Quran ayahs whose wording is similar. While reading, add an ayah, mark the similar words, and link it to the other ayahs that share them. Later, open the set to compare them side by side, with the differing words highlighted.

- Design: https://claude.ai/artifact/JvndWKD5BmVdfjPRRnTS8Q
- Plan and architecture: [PLAN.md](PLAN.md)

## Quick start (no database needed)

```bash
npm install
cp .env.example .env.local      # then set AUTH_SECRET (npx auth secret) and SEED_USER_*
npm run db:seed                 # creates the seed user + 4 sample sets in data/store.json
npm run dev                     # http://localhost:3000
```

Log in with the `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` from `.env.local`, or sign up at `/signup`. New sign-ups get the sample sets when `SAMPLE_SETS_FOR_NEW_USERS=true`.

## Moving to Neon (Postgres)

1. Create a Neon project → **Connect**. Copy the **pooled** string into `DATABASE_URL` and the **direct** string into `DATABASE_URL_UNPOOLED` in `.env.local`.
2. `npm run db:migrate`, which creates the tables from `db/migrations/`.
3. Set `STORAGE=db`.
4. Either `npm run db:seed` (fresh start) or `npm run db:import-json` (copy everything from `data/store.json`, keeping ids).
5. `npm run dev`

`DB_DRIVER` chooses the connection:

| Value | Use it for |
|---|---|
| `neon-http` (default) | Serverless (Vercel). No interactive transactions; the app doesn't need them. |
| `neon-ws` | A long-running Node server; pooled WebSocket connections. |
| `pg` | Local or self-hosted Postgres, e.g. `postgresql://postgres:postgres@localhost:5432/mutashabihat` |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` · `lint` · `test` | TypeScript, ESLint, Vitest |
| `npm run db:generate` | New migration after editing `db/schema.ts` |
| `npm run db:migrate` | Apply migrations (uses `DATABASE_URL_UNPOOLED` if set) |
| `npm run db:push` | Push the schema straight to the DB, no migration file (prototyping only) |
| `npm run db:studio` | Drizzle Studio: browse and edit tables in the browser |
| `npm run db:check` | Check migration files for conflicts |
| `npm run db:seed` | Create/keep the seed user and add the sample sets (works for json and db) |
| `npm run db:import-json` | Copy `data/store.json` into Postgres |
| `npm run gen:surahs` | Regenerate `lib/quran/surahs.ts` from the Quran.com API |

## How it fits together

- **Quran text:** fetched from the Quran.com API v4 (no key needed) in `lib/quran/client.ts`, and cached. Each saved ayah also keeps a copy of its text, so saved sets still render if the API is down.
- **Storage:** every page and action calls `getRepo()` (`lib/repo`). `STORAGE=json` uses `json-repo.ts` (a local file with atomic writes) and `STORAGE=db` uses `drizzle-repo.ts`. Both implement the same interface.
- **Auth:** Auth.js v5 (`auth.ts`) with the Credentials provider against our own `users` table. Passwords are hashed with bcrypt and sessions are JWT cookies. `proxy.ts` redirects signed-out visitors, and each page and action re-checks the session with `requireUserId()`.
- **Differences:** word-level LCS (`lib/diff/lcs.ts`). It catches changed and missing words, and word-order changes.
