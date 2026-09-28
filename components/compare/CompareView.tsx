'use client';

import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { getSurah } from '@/lib/quran/surahs';
import type { MutashabihSet } from '@/lib/repo/types';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';
import { CheckIcon } from '@/components/ui/icons';
import { AyahCard } from './AyahCard';
import { SetHeader } from './SetHeader';
import { buildTokens, type Mode } from './tokens';

export type ViewState = { mode: Mode; layout: 'side' | 'stack'; diff: boolean; hidden: string[] };

const MODES: { value: Mode; label: string }[] = [
  { value: 'phrase', label: 'Phrase only' },
  { value: 'ayah', label: 'Full ayah' },
  { value: 'context', label: '± 1 ayah' },
];
const LAYOUTS = [
  { value: 'side' as const, label: 'Side by side' },
  { value: 'stack' as const, label: 'Stacked' },
];
const GRID_COLS = ['md:grid-cols-1', 'md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3'];

/** Keeps the view in the URL (?mode=&layout=&diff=&hide=) so reloads and shared links open the same view. */
function useUrlSync(view: ViewState) {
  useEffect(() => {
    const url = new URL(window.location.href);
    const set = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    set('mode', view.mode === 'ayah' ? null : view.mode);
    set('layout', view.layout === 'side' ? null : view.layout);
    set('diff', view.diff ? null : '0');
    set('hide', view.hidden.length ? view.hidden.join(',') : null);
    window.history.replaceState(null, '', url);
  }, [view]);
}

export function CompareView({
  set,
  context,
  initial,
}: {
  set: MutashabihSet;
  context: Record<string, string>;
  initial: ViewState;
}) {
  const [view, setView] = useState<ViewState>(initial);
  useUrlSync(view);
  const update = (patch: Partial<ViewState>) => setView((v) => ({ ...v, ...patch }));

  // Members can be removed while hidden keys still point at them.
  const hidden = useMemo(
    () => view.hidden.filter((k) => set.members.some((m) => m.verseKey === k)),
    [view.hidden, set.members],
  );
  const visible = useMemo(() => set.members.filter((m) => !hidden.includes(m.verseKey)), [set.members, hidden]);
  const tokens = useMemo(() => buildTokens(visible, view.mode, view.diff), [visible, view.mode, view.diff]);

  const hide = (key: string) => {
    if (visible.length <= 1) return; // keep at least one ayah on screen
    update({ hidden: [...hidden, key] });
  };
  const toggle = (key: string) => (hidden.includes(key) ? update({ hidden: hidden.filter((k) => k !== key) }) : hide(key));
  const cols = view.layout === 'side' ? Math.min(Math.max(visible.length, 1), 3) : 1;
  const diffShown = view.diff && visible.length > 1;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <SetHeader set={set} />

      <section
        aria-label="View options"
        className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface px-4 py-4 md:px-5 md:py-[18px]"
      >
        <div className="flex flex-wrap items-center gap-2.5 md:gap-3.5">
          <span className="w-full text-[13px] font-semibold text-ink-2 md:w-[92px]">Ayahs</span>
          {set.members.map((m) => {
            const on = !hidden.includes(m.verseKey);
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(m.verseKey)}
                className={clsx(
                  'flex h-[38px] cursor-pointer items-center gap-2 rounded-full border pr-3.5 pl-2.5 text-sm font-medium',
                  on ? 'border-teal bg-teal-soft text-teal-dark' : 'border-line-2 bg-surface text-ink-2',
                )}
              >
                <span
                  className={clsx(
                    'flex size-[18px] items-center justify-center rounded-[5px]',
                    on ? 'bg-teal text-white' : 'border-[1.5px] border-ink-4',
                  )}
                >
                  {on && <CheckIcon size={12} strokeWidth={3.5} />}
                </span>
                {m.verseKey}
                <span className="hidden sm:inline">· {getSurah(m.surah)?.nameEn}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => update({ hidden: [] })}
            className="h-[38px] cursor-pointer px-3 text-sm font-semibold text-teal underline underline-offset-[3px]"
          >
            Show all
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
          <div className="flex w-full items-center gap-3.5 md:w-auto">
            <span className="hidden w-[92px] text-[13px] font-semibold text-ink-2 md:inline">Show</span>
            <Segmented label="How much text" options={MODES} value={view.mode} onChange={(mode) => update({ mode })} className="flex-1 md:flex-none" />
          </div>
          <div className="hidden items-center gap-3.5 md:flex">
            <span className="text-[13px] font-semibold text-ink-2">Layout</span>
            <Segmented label="Layout" options={LAYOUTS} value={view.layout} onChange={(layout) => update({ layout })} />
          </div>
          <Switch checked={view.diff} onChange={(diff) => update({ diff })} label="Highlight differences" />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-2">
        {diffShown && (
          <span className="flex items-center gap-2">
            <span className="h-3 w-[18px] rounded-[3px] bg-amber-bg shadow-[inset_0_-2px_0_var(--color-amber-line)]" />
            Differs from the other ayahs shown
          </span>
        )}
        <span className="flex items-center gap-2">
          <span className="h-[3px] w-[18px] bg-ink" />
          Tracked phrase
        </span>
        {view.mode !== 'phrase' && (
          <span className="flex items-center gap-2">
            <span className="h-[3px] w-[18px] bg-ink-4" />
            Rest of the ayah
          </span>
        )}
      </div>

      <div className={clsx('grid grid-cols-1 items-start gap-4 md:gap-5', GRID_COLS[cols])}>
        {visible.map((m, i) => (
          <AyahCard
            key={m.id}
            member={m}
            tokens={tokens[i]}
            prev={view.mode === 'context' ? context[`${m.surah}:${m.ayah - 1}`] : undefined}
            next={view.mode === 'context' ? context[`${m.surah}:${m.ayah + 1}`] : undefined}
            canHide={visible.length > 1}
            onHide={() => hide(m.verseKey)}
          />
        ))}
      </div>

      {hidden.length > 0 && (
        <p className="text-sm text-ink-2">
          {hidden.length} hidden ·{' '}
          <button
            type="button"
            onClick={() => update({ hidden: [] })}
            className="cursor-pointer font-semibold text-teal underline underline-offset-[3px]"
          >
            show all
          </button>
        </p>
      )}
    </div>
  );
}
