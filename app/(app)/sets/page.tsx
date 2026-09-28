import { redirect } from 'next/navigation';
import { ButtonLink } from '@/components/ui/Button';
import { PlusIcon } from '@/components/ui/icons';
import { requireUserId } from '@/lib/auth/session';
import { getRepo } from '@/lib/repo';

export const metadata = { title: 'Sets' };

export default async function SetsIndex() {
  const userId = await requireUserId();
  const sets = await getRepo().listSets(userId);
  if (sets.length > 0) redirect(`/sets/${sets[0].id}`);

  return (
    <section className="mx-auto mt-10 flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-line bg-surface px-8 py-12 text-center">
      <h1 className="font-display text-3xl font-medium">No sets yet</h1>
      <p className="text-base leading-relaxed text-ink-2">
        While reading, add an ayah that reminds you of another one. Mark the similar words, link the other ayah, and
        compare them here.
      </p>
      <ButtonLink href="/add">
        <PlusIcon /> Add your first ayah
      </ButtonLink>
    </section>
  );
}
