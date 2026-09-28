'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { removeMember, updatePhrase } from '@/lib/actions/sets';
import { getSurah } from '@/lib/quran/surahs';
import { arabicNumber, quranComUrl } from '@/lib/quran/verseKey';
import type { SetMember } from '@/lib/repo/types';
import { Button } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
import { ExternalIcon, PencilIcon, TrashIcon, XIcon } from '@/components/ui/icons';
import { WordPicker, type Range } from '@/components/WordPicker';
import type { Token } from './tokens';

function Context({ label, text, position }: { label: string; text: string; position: 'before' | 'after' }) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-0.5 bg-surface-2 px-4 md:px-[22px]',
        position === 'before' ? 'border-b border-dashed border-line pt-3.5 pb-2.5' : 'border-t border-dashed border-line pt-2.5 pb-3.5',
      )}
    >
      <span className="text-xs font-semibold text-ink-3">{label}</span>
      <p lang="ar" className="quran text-[17px] leading-[2] text-ink-3 md:text-xl md:leading-[2.1]">
        {text}
      </p>
    </div>
  );
}

export function AyahCard({
  member,
  tokens,
  prev,
  next,
  canHide,
  onHide,
}: {
  member: SetMember;
  tokens: Token[];
  prev?: string;
  next?: string;
  canHide: boolean;
  onHide: () => void;
}) {
  const router = useRouter();
  const surah = getSurah(member.surah);
  const [editing, setEditing] = useState(false);
  const [range, setRange] = useState<Range>({ s: member.phraseStart, e: member.phraseEnd });
  const [awaitingEnd, setAwaitingEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const savePhrase = () =>
    start(async () => {
      if (!range) return;
      const r = await updatePhrase({ memberId: member.id, s: range.s, e: range.e });
      if (!r.ok) return setError(r.error);
      setEditing(false);
      router.refresh();
    });

  const remove = () => {
    if (!confirm(`Remove ${member.verseKey} from this set?`)) return;
    start(async () => {
      const r = await removeMember(member.id);
      if (!r.ok) return setError(r.error);
      router.refresh();
      if (r.data.setDeleted) router.push('/sets');
    });
  };

  return (
    <article className={clsx('flex flex-col overflow-hidden rounded-2xl border border-line bg-surface', pending && 'opacity-60')}>
      <div className="flex items-center gap-2.5 border-b border-muted-bg py-2.5 pr-2 pl-3.5 md:gap-3 md:py-3 md:pl-[18px]">
        <span className="rounded-full bg-teal-soft px-2.5 py-1 text-sm font-semibold text-teal tabular-nums">{member.verseKey}</span>
        <span className="flex-1 truncate text-[15px] font-medium">{surah?.nameEn}</span>
        <span lang="ar" dir="rtl" className="font-quran text-lg text-ink-2">
          {surah?.nameAr}
        </span>
        <Menu
          label={`Options for ${member.verseKey}`}
          items={[
            { label: 'Edit similar words', icon: <PencilIcon size={16} />, onSelect: () => setEditing(true) },
            { label: 'Open on quran.com', icon: <ExternalIcon size={16} />, onSelect: () => {}, href: quranComUrl(member.verseKey) },
            { label: 'Remove from set', icon: <TrashIcon size={16} />, onSelect: remove, danger: true },
          ]}
        />
        {canHide && (
          <button
            type="button"
            onClick={onHide}
            aria-label={`Hide ${member.verseKey}`}
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-ink-3 hover:bg-muted-bg hover:text-ink"
          >
            <XIcon />
          </button>
        )}
      </div>

      {prev && <Context label={`Before · ${member.surah}:${member.ayah - 1}`} text={prev} position="before" />}

      {editing ? (
        <div className="flex flex-col gap-3 px-4 py-4">
          <WordPicker
            text={member.textSnapshot}
            range={range}
            awaitingEnd={awaitingEnd}
            size="sm"
            onChange={(r, a) => {
              setRange(r);
              setAwaitingEnd(a);
            }}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={savePhrase} disabled={!range || pending}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p lang="ar" className="quran px-4 pt-3 pb-3.5 text-[23px] leading-[2.2] md:px-[22px] md:pt-[18px] md:pb-5 md:text-[27px] md:leading-[2.25]">
          {tokens.map((t, i) => (
            <span
              key={i}
              className={clsx(
                'me-[0.28em] inline-block rounded-md px-[3px]',
                t.kind === 'waqf' && 'text-[0.8em] text-teal',
                t.kind === 'word' && (t.inPhrase ? 'text-ink' : 'text-ink-4'),
                t.differs && 'bg-amber-bg text-amber-ink! shadow-[inset_0_-2px_0_var(--color-amber-line)]',
              )}
            >
              {t.w}
            </span>
          ))}
          <span className="inline-block text-xl text-teal md:text-2xl">﴿{arabicNumber(member.ayah)}﴾</span>
        </p>
      )}
      {error && !editing && <p className="px-5 pb-3 text-sm text-danger">{error}</p>}

      {next && <Context label={`After · ${member.surah}:${member.ayah + 1}`} text={next} position="after" />}
    </article>
  );
}
