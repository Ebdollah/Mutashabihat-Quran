/**
 * Copies everything from the local JSON store (data/store.json) into Postgres, keeping ids.
 * Run once when moving from STORAGE=json to STORAGE=db (after `npm run db:migrate`):
 *   npm run db:import-json
 * Rows that already exist (same id or same email) are skipped.
 */
import './load-env';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getDb } from '@/db';
import { sets, setMembers, users } from '@/db/schema';
import { env } from '@/lib/env';
import type { MutashabihSet, User } from '@/lib/repo/types';

async function main() {
  const file = path.resolve(process.cwd(), env.JSON_STORE_PATH);
  const store = JSON.parse(await fs.readFile(file, 'utf8')) as { users: User[]; sets: MutashabihSet[] };
  const db = getDb();

  for (const u of store.users) {
    await db
      .insert(users)
      .values({ ...u, createdAt: new Date(u.createdAt) })
      .onConflictDoNothing();
  }
  for (const s of store.sets) {
    const inserted = await db
      .insert(sets)
      .values({ id: s.id, userId: s.userId, title: s.title, note: s.note, createdAt: new Date(s.createdAt), updatedAt: new Date(s.updatedAt) })
      .onConflictDoNothing()
      .returning({ id: sets.id });
    if (inserted.length === 0) continue;
    if (s.members.length) {
      await db.insert(setMembers).values(
        s.members.map((m) => ({ ...m, userId: s.userId, createdAt: new Date(m.createdAt) })),
      );
    }
  }
  console.log(`Imported ${store.users.length} users and ${store.sets.length} sets from ${env.JSON_STORE_PATH}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
