/** Regenerates lib/quran/surahs.ts from the Quran.com API. Only needed if the list ever has to be rebuilt. */
import { writeFileSync } from 'node:fs';

type Chapter = { id: number; name_simple: string; name_arabic: string; verses_count: number; revelation_place: string; translated_name: { name: string } };

async function main() {
  const res = await fetch('https://api.quran.com/api/v4/chapters?language=en', { headers: { 'User-Agent': 'mutashabihat/1.0' } });
  const { chapters } = (await res.json()) as { chapters: Chapter[] };
  const rows = chapters.map((c) =>
    JSON.stringify({ id: c.id, nameEn: c.name_simple, nameAr: c.name_arabic, meaning: c.translated_name.name, verses: c.verses_count, place: c.revelation_place }),
  );
  writeFileSync(
    'lib/quran/surahs.ts',
    [
      '// Generated from https://api.quran.com/api/v4/chapters by scripts/gen-surahs.ts — do not edit by hand.',
      "export type Surah = { id: number; nameEn: string; nameAr: string; meaning: string; verses: number; place: 'makkah' | 'madinah' };",
      '',
      'export const SURAHS: Surah[] = [',
      ...rows.map((r) => `  ${r},`),
      '];',
      '',
      'export function getSurah(id: number): Surah | undefined {',
      '  return SURAHS[id - 1];',
      '}',
      '',
    ].join('\n'),
  );
  console.log(`Wrote ${rows.length} surahs.`);
}

main();
