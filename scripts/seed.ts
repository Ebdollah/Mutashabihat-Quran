/**
 * Creates the seed user (SEED_USER_EMAIL / SEED_USER_PASSWORD / SEED_USER_NAME) and gives them the sample sets.
 * Works for both STORAGE=json and STORAGE=db. Safe to run again: existing user and sample sets are kept.
 *   npm run db:seed
 *   SEED_RESET_PASSWORD=true npm run db:seed   # also resets the user's password to SEED_USER_PASSWORD
 */
import './load-env';
import { hash } from 'bcryptjs';
import { env } from '@/lib/env';
import { getRepo } from '@/lib/repo';
import { addSampleSets } from '@/lib/sample';

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  const name = process.env.SEED_USER_NAME || null;
  if (!email || !password) {
    throw new Error('Set SEED_USER_EMAIL and SEED_USER_PASSWORD in .env.local first (see .env.example).');
  }

  const repo = getRepo();
  console.log(`Storage: ${env.STORAGE}${env.STORAGE === 'db' ? ` (${env.DB_DRIVER})` : ` (${env.JSON_STORE_PATH})`}`);

  let user = await repo.getUserByEmail(email);
  if (user) {
    console.log(`User ${user.email} already exists.`);
    if (process.env.SEED_RESET_PASSWORD === 'true') {
      await repo.updatePassword(user.id, await hash(password, 12));
      console.log('Password reset.');
    }
  } else {
    user = await repo.createUser({ email, name, passwordHash: await hash(password, 12) });
    console.log(`Created user ${user.email}.`);
  }

  const added = await addSampleSets(repo, user.id);
  console.log(added ? `Added ${added} sample sets.` : 'Sample sets already present.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
