import { getSurah } from './surahs';

export type VerseRef = { surah: number; ayah: number };

export function isValidRef(surah: number, ayah: number): boolean {
  const s = getSurah(surah);
  return !!s && Number.isInteger(ayah) && ayah >= 1 && ayah <= s.verses;
}

export function parseKey(key: string): VerseRef | null {
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(key.trim());
  if (!m) return null;
  const ref = { surah: Number(m[1]), ayah: Number(m[2]) };
  return isValidRef(ref.surah, ref.ayah) ? ref : null;
}

export const toKey = (surah: number, ayah: number) => `${surah}:${ayah}`;

/** Previous ayah in the same surah, or null for ayah 1. Context never crosses surahs. */
export function prevKey(key: string): string | null {
  const r = parseKey(key);
  return r && r.ayah > 1 ? toKey(r.surah, r.ayah - 1) : null;
}

/** Next ayah in the same surah, or null for the last ayah. */
export function nextKey(key: string): string | null {
  const r = parseKey(key);
  return r && isValidRef(r.surah, r.ayah + 1) ? toKey(r.surah, r.ayah + 1) : null;
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const arabicNumber = (n: number) => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

export const quranComUrl = (key: string) => `https://quran.com/${key.replace(':', '/')}`;
