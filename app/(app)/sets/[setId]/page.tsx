import { notFound } from 'next/navigation';
import { z } from 'zod';
import { CompareView, type ViewState } from '@/components/compare/CompareView';
import { requireUserId } from '@/lib/auth/session';
import { getVerses } from '@/lib/quran/client';
import { nextKey, prevKey } from '@/lib/quran/verseKey';
import { getRepo } from '@/lib/repo';

async function loadSet(setId: string) {
  if (!z.uuid().safeParse(setId).success) return null;
  const userId = await requireUserId();
  return getRepo().getSet(userId, setId);
}

export async function generateMetadata({ params }: PageProps<'/sets/[setId]'>) {
  const set = await loadSet((await params).setId);
  return { title: set?.title ?? 'Set not found' };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SetPage({ params, searchParams }: PageProps<'/sets/[setId]'>) {
  const set = await loadSet((await params).setId);
  if (!set) notFound();

  // Ayahs before/after each member, for the "± 1 ayah" view. Failures just leave that context out.
  const ctxKeys = set.members.flatMap((m) => [prevKey(m.verseKey), nextKey(m.verseKey)]).filter((k): k is string => !!k);
  const verses = await getVerses(ctxKeys);
  const context = Object.fromEntries(Object.values(verses).map((v) => [v.key, v.text]));

  const sp = await searchParams;
  const mode = one(sp.mode);
  const initial: ViewState = {
    mode: mode === 'phrase' || mode === 'context' ? mode : 'ayah',
    layout: one(sp.layout) === 'stack' ? 'stack' : 'side',
    diff: one(sp.diff) !== '0',
    hidden: (one(sp.hide) ?? '').split(',').filter((k) => set.members.some((m) => m.verseKey === k)),
  };
  if (initial.hidden.length >= set.members.length) initial.hidden = [];

  return <CompareView key={set.id} set={set} context={context} initial={initial} />;
}
