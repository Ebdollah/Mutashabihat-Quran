'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserId } from '@/lib/auth/session';
import { getVerse, QuranApiError, type Verse } from '@/lib/quran/client';
import { parseKey } from '@/lib/quran/verseKey';
import { isValidPhrase } from '@/lib/quran/tokens';
import { getRepo, RepoError, type MutashabihSet, type NewMember } from '@/lib/repo';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const verseKey = z.string().refine((k) => parseKey(k) !== null, 'Invalid surah or ayah.');
const idx = z.number().int().min(0).max(500);
const memberInput = z.object({ key: verseKey, s: idx, e: idx });

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0].message };
    if (err instanceof RepoError) return { ok: false, error: err.message };
    if (err instanceof QuranApiError) return { ok: false, error: 'Couldn’t load the ayah text. Check your connection and try again.' };
    throw err; // includes redirect() from requireUserId
  }
}

function refresh(setId?: string) {
  revalidatePath('/sets', 'layout');
  if (setId) revalidatePath(`/sets/${setId}`);
}

/** Text always comes from the Quran API on the server; the client only sends key + word range. */
async function toNewMember(m: z.infer<typeof memberInput>): Promise<NewMember> {
  const verse = await getVerse(m.key);
  if (!verse) throw new RepoError('not_found', `Ayah ${m.key} was not found.`);
  if (!isValidPhrase(verse.text, m.s, m.e)) throw new RepoError('invalid', `Mark the similar words in ${m.key} again.`);
  return { verseKey: m.key, phraseStart: m.s, phraseEnd: m.e, textSnapshot: verse.text };
}

export async function lookupVerse(key: string): Promise<ActionResult<{ verse: Verse; sets: MutashabihSet[] }>> {
  return run(async () => {
    const userId = await requireUserId();
    const k = verseKey.parse(key);
    const verse = await getVerse(k);
    if (!verse) throw new RepoError('not_found', `Ayah ${k} was not found.`);
    return { verse, sets: await getRepo().findSetsByVerse(userId, k) };
  });
}

export async function createSet(input: { title?: string; members: { key: string; s: number; e: number }[] }) {
  return run(async () => {
    const userId = await requireUserId();
    const data = z
      .object({ title: z.string().max(120).optional(), members: z.array(memberInput).min(1).max(20) })
      .parse(input);
    const members = await Promise.all(data.members.map(toNewMember));
    const set = await getRepo().createSet(userId, { title: data.title, members });
    refresh(set.id);
    return { setId: set.id, title: set.title };
  });
}

export async function addMemberToSet(input: { setId: string; key: string; s: number; e: number }) {
  return run(async () => {
    const userId = await requireUserId();
    const data = memberInput.extend({ setId: z.uuid() }).parse(input);
    const set = await getRepo().addMember(userId, data.setId, await toNewMember(data));
    refresh(set.id);
    return { setId: set.id, title: set.title };
  });
}

export async function updatePhrase(input: { memberId: string; s: number; e: number }) {
  return run(async () => {
    const userId = await requireUserId();
    const d = z.object({ memberId: z.uuid(), s: idx, e: idx }).parse(input);
    const set = await getRepo().updateMemberPhrase(userId, d.memberId, d.s, d.e);
    refresh(set.id);
    return { setId: set.id };
  });
}

export async function removeMember(memberId: string) {
  return run(async () => {
    const userId = await requireUserId();
    const set = await getRepo().removeMember(userId, z.uuid().parse(memberId));
    refresh(set?.id);
    return { setDeleted: set === null };
  });
}

export async function renameSet(setId: string, title: string) {
  return run(async () => {
    const userId = await requireUserId();
    const set = await getRepo().renameSet(userId, z.uuid().parse(setId), z.string().min(1).max(120).parse(title));
    refresh(set.id);
    return { title: set.title };
  });
}

export async function reorderMembers(setId: string, memberIds: string[]) {
  return run(async () => {
    const userId = await requireUserId();
    const set = await getRepo().reorderMembers(userId, z.uuid().parse(setId), z.array(z.uuid()).parse(memberIds));
    refresh(set.id);
    return { setId: set.id };
  });
}

export async function deleteSet(setId: string) {
  return run(async () => {
    const userId = await requireUserId();
    await getRepo().deleteSet(userId, z.uuid().parse(setId));
    refresh();
    return { deleted: true };
  });
}
