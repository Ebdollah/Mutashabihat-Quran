import { AuthForm } from '@/components/AuthForm';

export const metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const next = (await searchParams).next;
  return <AuthForm kind="login" next={typeof next === 'string' ? next : undefined} />;
}
