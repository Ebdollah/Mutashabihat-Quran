import { SetPills, SetSidebar } from '@/components/SetSidebar';
import { requireUserId } from '@/lib/auth/session';
import { getRepo } from '@/lib/repo';
import { toSummary } from '@/lib/sets-view';

export default async function SetsLayout({ children }: LayoutProps<'/sets'>) {
  const userId = await requireUserId();
  const summaries = (await getRepo().listSets(userId)).map(toSummary);

  return (
    <>
      <SetSidebar sets={summaries} />
      <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-4 pb-8 md:gap-6 md:px-10 md:pt-8 md:pb-12">
        <SetPills sets={summaries} />
        {children}
      </main>
    </>
  );
}
