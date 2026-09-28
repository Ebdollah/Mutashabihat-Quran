import { describe, expect, it } from 'vitest';
import sample from '@/data/sample-sets.json';
import { commonMasks, lcsMask } from '@/lib/diff/lcs';
import { isValidPhrase, isWaqf, phraseText, tokenize } from '@/lib/quran/tokens';
import { arabicNumber, nextKey, parseKey, prevKey } from '@/lib/quran/verseKey';
import { buildTokens } from '@/components/compare/tokens';
import type { SetMember } from '@/lib/repo/types';

const text = (key: string) => {
  for (const s of sample.sets) for (const m of s.members) if (m.verseKey === key) return m.textSnapshot;
  throw new Error(key);
};

describe('verse keys', () => {
  it('parses and bounds-checks', () => {
    expect(parseKey('2:58')).toEqual({ surah: 2, ayah: 58 });
    expect(parseKey('1:7')).not.toBeNull();
    expect(parseKey('114:6')).not.toBeNull();
    expect(parseKey('2:287')).toBeNull();
    expect(parseKey('115:1')).toBeNull();
    expect(parseKey('0:1')).toBeNull();
    expect(parseKey('abc')).toBeNull();
  });
  it('never crosses surahs for context', () => {
    expect(prevKey('2:1')).toBeNull();
    expect(prevKey('2:58')).toBe('2:57');
    expect(nextKey('1:7')).toBeNull();
    expect(nextKey('7:161')).toBe('7:162');
  });
  it('formats Arabic-Indic numbers', () => {
    expect(arabicNumber(161)).toBe('١٦١');
  });
});

describe('tokens', () => {
  it('keeps waqf marks as their own tokens', () => {
    const t = tokenize(text('2:58'));
    expect(t.some(isWaqf)).toBe(true);
    expect(phraseText(text('2:35'), 1, 2)).toBe(tokenize(text('2:35')).slice(1, 3).join(' '));
  });
  it('validates phrase ranges', () => {
    const t = text('2:58');
    const waqfAt = tokenize(t).findIndex(isWaqf);
    expect(isValidPhrase(t, 0, 3)).toBe(true);
    expect(isValidPhrase(t, 3, 2)).toBe(false);
    expect(isValidPhrase(t, 0, 999)).toBe(false);
    expect(isValidPhrase(t, 0, waqfAt)).toBe(false);
  });
});

describe('diff', () => {
  it('lcsMask marks the common subsequence', () => {
    expect(lcsMask(['a', 'b', 'c', 'd'], ['a', 'c', 'd'])).toEqual([true, false, true, true]);
  });
  it('catches word-order changes', () => {
    const [x, y] = commonMasks([
      ['p', 'q', 'r', 's'],
      ['p', 'r', 'q', 's'],
    ]);
    expect(x.filter((c) => !c)).toHaveLength(1);
    expect(y.filter((c) => !c)).toHaveLength(1);
  });
  it('flags the real differences between 2:35 and 7:19 (phrase mode)', () => {
    const members = sample.sets[0].members.map((m, i) => ({ ...m, id: String(i), position: i }) as unknown as SetMember);
    const [a, b] = buildTokens(members, 'phrase', true);
    const diffA = a.filter((t) => t.differs).map((t) => t.w);
    const diffB = b.filter((t) => t.differs).map((t) => t.w);
    const w35 = tokenize(text('2:35'));
    const w19 = tokenize(text('7:19'));
    // 2:35: يا آدم / وَكُلَا / مِنْهَا / رَغَدًا — 7:19: وَيَا آدم / فَكُلَا / مِنْ
    expect(diffA).toEqual([w35[1], w35[6], w35[7], w35[8]]);
    expect(diffB).toEqual([w19[0], w19[5], w19[6]]);
  });
  it('shows no differences for a single ayah', () => {
    const m = { ...sample.sets[0].members[0], id: '1', position: 0 } as unknown as SetMember;
    expect(buildTokens([m], 'ayah', true)[0].some((t) => t.differs)).toBe(false);
  });
});
