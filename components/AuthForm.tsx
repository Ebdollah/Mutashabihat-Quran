'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, signupAction, type FormState } from '@/lib/actions/auth';
import { buttonClass } from '@/components/ui/Button';

const inputCls = 'h-12 w-full rounded-[10px] border border-line-2 bg-surface px-3 text-[15px] text-ink outline-none focus:border-teal';

function Field({
  name,
  label,
  type = 'text',
  autoComplete,
  defaultValue,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <input id={name} name={name} type={type} autoComplete={autoComplete} defaultValue={defaultValue} required={required} className={inputCls} />
    </div>
  );
}

export function AuthForm({ kind, next }: { kind: 'login' | 'signup'; next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(kind === 'login' ? loginAction : signupAction, undefined);
  const f = state?.fields ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="font-display text-[28px] font-medium">{kind === 'login' ? 'Log in' : 'Create an account'}</h1>
      {kind === 'signup' && <Field name="name" label="Name (optional)" autoComplete="name" defaultValue={f.name} required={false} />}
      <Field name="email" label="Email" type="email" autoComplete="email" defaultValue={f.email} />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete={kind === 'login' ? 'current-password' : 'new-password'}
      />
      {kind === 'signup' && <Field name="confirm" label="Confirm password" type="password" autoComplete="new-password" />}
      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={buttonClass('primary', 'md', 'mt-1 w-full')}>
        {pending ? 'Please wait…' : kind === 'login' ? 'Log in' : 'Create account'}
      </button>

      <p className="text-center text-sm text-ink-2">
        {kind === 'login' ? (
          <>
            No account yet? <Link href="/signup" className="font-semibold">Sign up</Link>
          </>
        ) : (
          <>
            Already have an account? <Link href="/login" className="font-semibold">Log in</Link>
          </>
        )}
      </p>
    </form>
  );
}
