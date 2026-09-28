import { z } from 'zod';
import { AddAyahForm } from '@/components/add/AddAyahForm';
import { requireUserId } from '@/lib/auth/session';
import { isValidRef } from '@/lib/quran/verseKey';
import { getRepo } from '@/lib/repo';

export const metadata = { title: 'Add ayah' };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AddPage({ searchParams }: PageProps<'/add'>) {
  const userId = await requireUserId();
  const sp = await searchParams;

  const surah = Number(one(sp.surah));
  const ayah = Number(one(sp.ayah));
  const start = isValidRef(surah, ayah) ? { surah, ayah } : { surah: 1, ayah: 1 };

  // ?set=<id> — opened from a set's "Add similar ayah" button.
  const setId = one(sp.set);
  const set = setId && z.uuid().safeParse(setId).success ? await getRepo().getSet(userId, setId) : null;
  const targetSet = set ? { id: set.id, title: set.title, keys: set.members.map((m) => m.verseKey) } : null;

  return (
    <main className="flex-1 overflow-y-auto px-4 pt-6 pb-10 md:px-12 md:pt-9 md:pb-12">
      <div className="mx-auto flex max-w-[1344px] flex-col gap-6 md:gap-7">
        <div className="flex max-w-[760px] flex-col gap-2">
          <h1 className="font-display text-[28px] leading-tight font-medium tracking-[-0.01em] md:text-4xl">
            {targetSet ? 'Add a similar ayah' : 'Add an ayah you’re reading'}
          </h1>
          <p className="text-base leading-relaxed text-ink-2">
            {targetSet
              ? 'Choose the ayah, then tap the first and last word of the part that is similar.'
              : 'Choose the surah and ayah. We check whether it is already in one of your sets, then you tap the first and last word of the part that is similar.'}
          </p>
        </div>
        <AddAyahForm initial={start} targetSet={targetSet} />
      </div>
    </main>
  );
}
