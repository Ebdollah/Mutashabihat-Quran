import { z } from 'zod';
import { env } from '@/lib/env';
import { parseKey } from './verseKey';

/**
 * Thin client for the Quran.com API v4 (no key needed).
 * Everything that talks to the Quran API goes through this file, so moving to the
 * Quran Foundation API (api.quran.foundation, OAuth client credentials) only changes this file.
 */

export type Verse = { key: string; surah: number; ayah: number; text: string };

const verseResponse = z.object({
  verse: z.object({ verse_key: z.string(), text_uthmani: z.string() }),
});

// Ayah text never changes, so a process-wide cache is safe.
const memory = new Map<string, Verse>();

export class QuranApiError extends Error {}

export async function getVerse(key: string): Promise<Verse | null> {
  const ref = parseKey(key);
  if (!ref) return null;
  const cached = memory.get(key);
  if (cached) return cached;

  const url = `${env.QURAN_API_BASE}/verses/by_key/${key}?fields=text_uthmani`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'mutashabihat/1.0', Accept: 'application/json' },
      next: { revalidate: env.QURAN_CACHE_SECONDS },
    });
  } catch (err) {
    throw new QuranApiError(`Quran API unreachable: ${(err as Error).message}`);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new QuranApiError(`Quran API error ${res.status} for ${key}`);

  const data = verseResponse.parse(await res.json());
  const verse: Verse = { key, surah: ref.surah, ayah: ref.ayah, text: data.verse.text_uthmani };
  memory.set(key, verse);
  return verse;
}

/** Fetches several ayahs in parallel. Missing or failed ones are left out instead of throwing. */
export async function getVerses(keys: string[]): Promise<Record<string, Verse>> {
  const unique = [...new Set(keys)];
  const results = await Promise.allSettled(unique.map((k) => getVerse(k)));
  const out: Record<string, Verse> = {};
  results.forEach((r) => {
    if (r.status === 'fulfilled' && r.value) out[r.value.key] = r.value;
  });
  return out;
}
