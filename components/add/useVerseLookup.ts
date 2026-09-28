'use client';

import { useEffect, useState } from 'react';
import { lookupVerse } from '@/lib/actions/sets';
import type { Verse } from '@/lib/quran/client';
import type { MutashabihSet } from '@/lib/repo/types';

export type Lookup =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; verse: Verse; sets: MutashabihSet[] };

type Settled = Exclude<Lookup, { status: 'idle' } | { status: 'loading' }>;

/**
 * Loads an ayah's text (Quran API, via the server) and the user's sets that already contain it.
 * Returns the lookup, an id that changes with every new result (use it to reset UI tied to a result), and retry().
 */
export function useVerseLookup(key: string | null, reloadToken = 0): [Lookup, string, () => void] {
  const [retry, setRetry] = useState(0);
  const request = key ? `${key}|${reloadToken}|${retry}` : '';
  // The result is stored with the request it answers; a different request means we're still loading.
  const [result, setResult] = useState<{ request: string; value: Settled } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    lookupVerse(key)
      .then((r) => {
        if (!cancelled) setResult({ request, value: r.ok ? { status: 'ready', ...r.data } : { status: 'error', error: r.error } });
      })
      .catch(() => {
        if (!cancelled) setResult({ request, value: { status: 'error', error: 'Something went wrong. Try again.' } });
      });
    return () => {
      cancelled = true;
    };
  }, [key, request]);

  const lookup: Lookup = !key ? { status: 'idle' } : result?.request === request ? result.value : { status: 'loading' };
  const resultId = result?.request === request ? request : '';
  return [lookup, resultId, () => setRetry((n) => n + 1)];
}
