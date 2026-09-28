import { z } from 'zod';
import { getVerse } from '@/lib/quran/client';
import { isValidPhrase } from '@/lib/quran/tokens';
import { parseKey } from '@/lib/quran/verseKey';
import { RepoError, type NewMember } from '@/lib/repo';

export const verseKeySchema = z.string().refine((k) => parseKey(k) !== null, 'Invalid surah or ayah.');
export const wordIndex = z.number().int().min(0).max(500);
export const memberInput = z.object({ key: verseKeySchema, s: wordIndex, e: wordIndex });
export type MemberInput = z.infer<typeof memberInput>;

/** Text always comes from the Quran API on the server; clients only send key + word range. */
export async function toNewMember(m: MemberInput): Promise<NewMember> {
  const verse = await getVerse(m.key);
  if (!verse) throw new RepoError('not_found', `Ayah ${m.key} was not found.`);
  if (!isValidPhrase(verse.text, m.s, m.e)) throw new RepoError('invalid', `Mark the similar words in ${m.key} again.`);
  return { verseKey: m.key, phraseStart: m.s, phraseEnd: m.e, textSnapshot: verse.text };
}
