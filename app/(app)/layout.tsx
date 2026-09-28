import { TopBar } from '@/components/TopBar';
import { requireUserId } from '@/lib/auth/session';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  await requireUserId();
  return (
    <div className="flex h-dvh flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}
