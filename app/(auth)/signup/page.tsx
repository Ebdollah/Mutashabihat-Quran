import { AuthForm } from '@/components/AuthForm';
import { env } from '@/lib/env';

export const metadata = { title: 'Sign up' };

export default function SignupPage() {
  if (!env.ALLOW_SIGNUP) {
    return <p className="text-center text-ink-2">Sign-up is turned off. Ask the owner for an account.</p>;
  }
  return <AuthForm kind="signup" />;
}
