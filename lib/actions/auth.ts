'use server';

import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';
import { env } from '@/lib/env';
import { RepoError } from '@/lib/repo';
import { createAccount, signupSchema } from '@/lib/services/accounts';

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

  try {
    await createAccount(parsed.data);
  } catch (err) {
    if (err instanceof RepoError && err.code === 'email_taken') return { error: err.message, fields };
    throw err;
  }

  await signIn('credentials', { email: parsed.data.email, password: parsed.data.password, redirectTo: '/sets' });
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' });
}
