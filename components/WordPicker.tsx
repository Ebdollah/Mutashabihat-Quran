'use client';

import clsx from 'clsx';
import { isWaqf, tokenize } from '@/lib/quran/tokens';

export type Range = { s: number; e: number } | null;

/**
 * Ayah words as buttons. First tap sets the start, second tap sets the end (either order).
 * `awaitingEnd` tells the parent which tap is next so it can show the right hint.
 */
export function WordPicker({
  text,
  range,
  awaitingEnd,
  onChange,
  size = 'md',
}: {
  text: string;
  range: Range;
  awaitingEnd: boolean;
  onChange: (range: Range, awaitingEnd: boolean) => void;
  size?: 'md' | 'sm';
}) {
  const words = tokenize(text);

  function pick(i: number) {
    if (!awaitingEnd || !range) onChange({ s: i, e: i }, true);
    else onChange({ s: Math.min(range.s, i), e: Math.max(range.s, i) }, false);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm text-ink-2">
        {awaitingEnd ? 'Now tap the last word of the similar part.' : 'Tap the first word of the similar part, then the last.'}
      </p>
      <div lang="ar" dir="rtl" className="flex flex-wrap gap-x-0.5 gap-y-1.5 rounded-xl bg-surface-2 px-3 py-3.5">
        {words.map((w, i) => {
          if (isWaqf(w)) {
            return (
              <span key={i} className="quran flex min-h-11 items-center px-1 text-lg text-teal">
                {w}
              </span>
            );
          }
          const on = !!range && i >= range.s && i <= range.e;
          const edge = !!range && (i === range.s || i === range.e);
          return (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              onClick={() => pick(i)}
              className={clsx(
                'quran min-h-11 cursor-pointer rounded-lg border-[1.5px] px-1.5 leading-[1.9]',
                size === 'md' ? 'text-[25px]' : 'text-[21px]',
                on
                  ? clsx('bg-teal-soft text-teal-dark', edge ? 'border-teal' : 'border-teal-line')
                  : 'border-transparent text-[#3a3630] hover:bg-muted-bg',
              )}
            >
              {w}
            </button>
          );
        })}
      </div>
    </div>
  );
}
