import { parseKey } from '@/lib/quran/verseKey';
import { isValidPhrase, phraseText, tokenize } from '@/lib/quran/tokens';
import { RepoError, type NewMember } from './types';

/** Validates a new member and derives surah/ayah/phraseText. Shared by both repository implementations. */
export function prepareMember(m: NewMember) {
  const ref = parseKey(m.verseKey);
  if (!ref) throw new RepoError('invalid', `Invalid verse key ${m.verseKey}`);
  if (!isValidPhrase(m.textSnapshot, m.phraseStart, m.phraseEnd)) {
    throw new RepoError('invalid', `Invalid phrase range for ${m.verseKey}`);
  }
  return {
    verseKey: m.verseKey,
    surah: ref.surah,
    ayah: ref.ayah,
    phraseStart: m.phraseStart,
    phraseEnd: m.phraseEnd,
    phraseText: phraseText(m.textSnapshot, m.phraseStart, m.phraseEnd),
    textSnapshot: m.textSnapshot,
  };
}

/** Default set title: the first few words of the first phrase. */
export function defaultTitle(members: NewMember[]): string {
  const m = members[0];
  const words = tokenize(phraseText(m.textSnapshot, m.phraseStart, m.phraseEnd));
  return words.slice(0, 4).join(' ') + (words.length > 4 ? '…' : '');
}

export function assertNoDuplicateKeys(keys: string[]) {
  if (new Set(keys).size !== keys.length) {
    throw new RepoError('duplicate_member', 'The same ayah cannot be added to a set twice.');
  }
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
