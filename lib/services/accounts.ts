import { compare, hash } from 'bcryptjs';
import { z } from 'zod';
import { env } from '@/lib/env';
import { getRepo, RepoError, type User } from '@/lib/repo';
import { addSampleSets } from '@/lib/sample';

// Compared against when the email is unknown, so a wrong email and a wrong password take the same time.
const DUMMY_HASH = '$2b$12$oxBVQUi5M0JKLGgcVDH83us7r0CFiYWTKi2w7LyNcMuVAcpTLpyEy';

export const credentialsSchema = z.object({ email: z.email(), password: z.string().min(1) });

export const signupSchema = z
  .object({
    name: z.string().trim().max(80).optional(),
    email: z.email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.').max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match.', path: ['confirm'] });

/** The user for these credentials, or null. Used by the website (Auth.js) and the mobile API. */
export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const user = await getRepo().getUserByEmail(email);
  const ok = await compare(password, user?.passwordHash ?? DUMMY_HASH);
  return user && ok ? user : null;
}

/** Creates an account (and gives it the sample sets when enabled). Throws RepoError('email_taken'). */
export async function createAccount(input: { email: string; name?: string; password: string }): Promise<User> {
  if (!env.ALLOW_SIGNUP) throw new RepoError('invalid', 'Sign-up is turned off.');
  const repo = getRepo();
  const user = await repo.createUser({
    email: input.email,
    name: input.name || null,
    passwordHash: await hash(input.password, 12),
  });
  if (env.SAMPLE_SETS_FOR_NEW_USERS) await addSampleSets(repo, user.id);
  return user;
}
