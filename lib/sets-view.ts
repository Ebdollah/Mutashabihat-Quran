import { getSurah } from '@/lib/quran/surahs';
import type { MutashabihSet } from '@/lib/repo/types';

export function surahNames(keys: string[]): string {
  const names: string[] = [];
  keys.forEach((k) => {
    const n = getSurah(Number(k.split(':')[0]))?.nameEn;
    if (n && !names.includes(n)) names.push(n);
  });
  return names.join(' · ');
}

/** Small, serialisable shape for the sidebar (keeps full ayah text out of the client bundle). */
export function toSummary(set: MutashabihSet) {
  const keys = set.members.map((m) => m.verseKey);
  return {
    id: set.id,
    title: set.title,
    preview: set.members[0]?.phraseText ?? '',
    keys,
    searchText: [set.title, keys.join(' '), surahNames(keys), set.members.map((m) => m.phraseText).join(' ')]
      .join(' ')
      .toLowerCase(),
  };
}
