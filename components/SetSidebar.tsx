'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PlusIcon, SearchIcon } from '@/components/ui/icons';
import { isArabicText } from '@/lib/quran/tokens';

export type SetSummary = {
  id: string;
  title: string;
  preview: string; // first member's phrase
  keys: string[];
  searchText: string;
};

function useActiveId() {
  const params = useParams<{ setId?: string }>();
  return params.setId;
}

export function SetSidebar({ sets }: { sets: SetSummary[] }) {
  const activeId = useActiveId();
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? sets.filter((s) => s.searchText.includes(needle)) : sets;
  }, [q, sets]);

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col gap-[18px] overflow-y-auto border-r border-line bg-surface-2 px-5 py-6 md:flex">
      <Link
        href="/add"
        className="flex h-[46px] items-center justify-center gap-2 rounded-[10px] bg-teal text-[15px] font-semibold text-white no-underline hover:bg-teal-dark"
      >
        <PlusIcon />
        Add ayah while reading
      </Link>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="set-search" className="text-[13px] font-medium text-ink-2">
          Search sets
        </label>
        <div className="flex h-[42px] items-center gap-2 rounded-[10px] border border-line-2 bg-surface px-3">
          <SearchIcon size={16} className="text-ink-3" />
          <input
            id="set-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Surah, ayah or word"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
          />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold tracking-[0.06em] text-ink-2 uppercase">Your sets</h2>
        <span className="text-[13px] text-ink-3">{sets.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((s) => {
          const on = s.id === activeId;
          return (
            <Link
              key={s.id}
              href={`/sets/${s.id}`}
              aria-current={on ? 'page' : undefined}
              className={clsx(
                'flex flex-col gap-0.5 rounded-xl border-[1.5px] px-3.5 py-3 no-underline',
                on ? 'border-teal bg-surface shadow-[0_1px_3px_rgba(29,27,23,0.08)]' : 'border-transparent hover:bg-surface',
              )}
            >
              {isArabicText(s.title) ? (
                <span lang="ar" dir="rtl" className="quran truncate text-lg leading-[1.9] font-semibold text-ink">
                  {s.title}
                </span>
              ) : (
                <span className="text-[15px] font-semibold text-ink">{s.title}</span>
              )}
              <span lang="ar" dir="rtl" className="quran truncate text-lg leading-[1.9] text-[#3a3630]">
                {s.preview}
              </span>
              <span className="text-[13px] text-ink-2">{s.keys.join('  ·  ')}</span>
            </Link>
          );
        })}
        {filtered.length === 0 && <p className="px-1 text-sm text-ink-3">No sets match “{q}”.</p>}
      </div>
    </aside>
  );
}

/** Phone: horizontal set pills instead of the sidebar. */
export function SetPills({ sets }: { sets: SetSummary[] }) {
  const activeId = useActiveId();
  if (sets.length === 0) return null;
  return (
    <nav aria-label="Sets" className="-mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 pb-0.5 md:hidden">
      {sets.map((s) => {
        const on = s.id === activeId;
        return (
          <Link
            key={s.id}
            href={`/sets/${s.id}`}
            aria-current={on ? 'page' : undefined}
            className={clsx(
              'flex h-10 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap no-underline',
              on ? 'border-teal bg-teal-soft text-teal-dark' : 'border-line-2 bg-surface text-ink-2',
            )}
          >
            {s.keys.join(' · ')}
          </Link>
        );
      })}
    </nav>
  );
}

