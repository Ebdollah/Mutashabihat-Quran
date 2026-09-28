'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteSet, renameSet } from '@/lib/actions/sets';
import type { MutashabihSet } from '@/lib/repo/types';
import { surahNames } from '@/lib/sets-view';
import { isArabicText } from '@/lib/quran/tokens';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
import { PencilIcon, PlusIcon, TrashIcon } from '@/components/ui/icons';

export function SetHeader({ set }: { set: MutashabihSet }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(set.title);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const r = await renameSet(set.id, title);
      if (!r.ok) return setError(r.error);
      setEditing(false);
      setError(null);
      router.refresh();
    });

  const remove = () => {
    if (!confirm(`Delete the set “${set.title}”? This cannot be undone.`)) return;
    start(async () => {
      const r = await deleteSet(set.id);
      if (!r.ok) return setError(r.error);
      router.push('/sets');
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-4 md:gap-6">
      <div className="flex min-w-0 flex-1 basis-full flex-col gap-1.5 md:basis-0">
        <span className="text-[13px] font-semibold tracking-[0.06em] text-teal uppercase">
          Mutashabihat set · {set.members.length} {set.members.length === 1 ? 'ayah' : 'ayahs'}
        </span>
        {editing ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label htmlFor="set-title" className="sr-only">
              Set title
            </label>
            <input
              id="set-title"
              autoFocus
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 min-w-0 flex-1 rounded-[10px] border border-line-2 bg-surface px-3 font-display text-2xl outline-none focus:border-teal"
            />
            <Button type="submit" size="sm" disabled={pending || !title.trim()}>
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={() => (setEditing(false), setTitle(set.title))}>
              Cancel
            </Button>
          </form>
        ) : isArabicText(set.title) ? (
          <h1 lang="ar" dir="rtl" className="quran text-[28px] leading-[1.8] md:text-[34px]">
            {set.title}
          </h1>
        ) : (
          <h1 className="font-display text-[25px] leading-tight font-medium tracking-[-0.01em] md:text-[34px]">{set.title}</h1>
        )}
        <span className="text-[15px] text-ink-2">{surahNames(set.members.map((m) => m.verseKey))}</span>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        <ButtonLink href={`/add?set=${set.id}`} variant="outline" size="sm">
          <PlusIcon size={16} /> Add similar ayah
        </ButtonLink>
        <Menu
          label="Set options"
          items={[
            { label: 'Rename set', icon: <PencilIcon size={16} />, onSelect: () => setEditing(true) },
            { label: 'Delete set', icon: <TrashIcon size={16} />, onSelect: remove, danger: true },
          ]}
        />
      </div>
    </div>
  );
}
