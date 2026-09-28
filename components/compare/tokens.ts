import { commonMasks } from '@/lib/diff/lcs';
import { isWaqf, tokenize } from '@/lib/quran/tokens';
import type { SetMember } from '@/lib/repo/types';

export type Mode = 'phrase' | 'ayah' | 'context';
export type Token = { w: string; kind: 'waqf' | 'word'; inPhrase: boolean; differs: boolean };

/**
 * Builds the tokens to render for each visible member.
 * Differences are computed only over the words currently shown (just the phrase in "phrase" mode),
 * and only when more than one ayah is visible.
 */
export function buildTokens(members: SetMember[], mode: Mode, diff: boolean): Token[][] {
  const shown = members.map((m) => {
    const all = tokenize(m.textSnapshot);
    const idx = all.map((_, i) => i).filter((i) => mode !== 'phrase' || (i >= m.phraseStart && i <= m.phraseEnd));
    return { m, all, idx, words: idx.map((i) => all[i]).filter((w) => !isWaqf(w)) };
  });
  const masks = diff && shown.length > 1 ? commonMasks(shown.map((x) => x.words)) : null;

  return shown.map((x, xi) => {
    let wi = 0;
    return x.idx.map((i): Token => {
      const w = x.all[i];
      if (isWaqf(w)) return { w, kind: 'waqf', inPhrase: false, differs: false };
      const differs = masks ? !masks[xi][wi] : false;
      wi++;
      return { w, kind: 'word', inPhrase: i >= x.m.phraseStart && i <= x.m.phraseEnd, differs };
    });
  });
}
