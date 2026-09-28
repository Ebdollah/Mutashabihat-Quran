'use server';

import { AuthError } from 'next-auth';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { signIn, signOut } from '@/auth';
import { env } from '@/lib/env';
import { getRepo, RepoError } from '@/lib/repo';
import { addSampleSets } from '@/lib/sample';

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

const safeNext = (next: FormDataEntryValue | null) => {
  const n = typeof next === 'string' ? next : '';
  return n.startsWith('/') && !n.startsWith('//') ? n : '/sets';
};

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '');
  try {
    await signIn('credentials', {
      email,
      password: String(form.get('password') ?? ''),
      redirectTo: safeNext(form.get('next')),
    });
  } catch (err) {
    if (err instanceof AuthError) return { error: 'Email or password is incorrect.', fields: { email } };
    throw err; // the success redirect is thrown as an error too; let Next handle it
  }
}

const signupSchema = z
  .object({
    name: z.string().trim().max(80).optional(),
    email: z.email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.').max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match.', path: ['confirm'] });

export async function signupAction(_prev: FormState, form: FormData): Promise<FormState> {
  const input = {
    name: String(form.get('name') ?? ''),
    email: String(form.get('email') ?? ''),
    password: String(form.get('password') ?? ''),
    confirm: String(form.get('confirm') ?? ''),
  };
  const fields = { name: input.name, email: input.email };
  if (!env.ALLOW_SIGNUP) return { error: 'Sign-up is turned off.', fields };

  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const repo = getRepo();
  try {
    const user = await repo.createUser({
      email: parsed.data.email,
      name: parsed.data.name || null,
      passwordHash: await hash(parsed.data.password, 12),
    });
    if (env.SAMPLE_SETS_FOR_NEW_USERS) await addSampleSets(repo, user.id);
  } catch (err) {
    if (err instanceof RepoError && err.code === 'email_taken') return { error: err.message, fields };
    throw err;
  }

  await signIn('credentials', { email: parsed.data.email, password: parsed.data.password, redirectTo: '/sets' });
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' });
}
