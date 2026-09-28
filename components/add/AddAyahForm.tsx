'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { addMemberToSet, createSet } from '@/lib/actions/sets';
import { phraseText } from '@/lib/quran/tokens';
import { toKey } from '@/lib/quran/verseKey';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CheckCircleIcon, CheckIcon } from '@/components/ui/icons';
import { WordPicker, type Range } from '@/components/WordPicker';
import { SurahAyahPicker } from './SurahAyahPicker';
import { useVerseLookup, type Lookup } from './useVerseLookup';

type TargetSet = { id: string; title: string; keys: string[] } | null;
type Toast = { text: string; href: string } | null;
type Selection = { for: string; range: Range; awaitingEnd: boolean } | null;

function StepTitle({ n, id, children }: { n: number; id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2.5 text-lg font-semibold">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-teal text-sm text-white">{n}</span>
      {children}
    </h2>
  );
}

function VerseArea({
  lookup,
  retry,
  range,
  awaitingEnd,
  onPick,
  emptyText,
}: {
  lookup: Lookup;
  retry: () => void;
  range: Range;
  awaitingEnd: boolean;
  onPick: (r: Range, awaitingEnd: boolean) => void;
  emptyText: string;
}) {
  if (lookup.status === 'idle') {
    return <div className="rounded-xl border border-dashed border-line-2 p-7 text-center text-sm text-ink-3">{emptyText}</div>;
  }
  if (lookup.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Loading ayah" className="flex flex-wrap justify-end gap-2 rounded-xl bg-surface-2 p-4">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="h-9 animate-pulse rounded-lg bg-muted-bg" style={{ width: 40 + ((i * 37) % 50) }} />
        ))}
      </div>
    );
  }
  if (lookup.status === 'error') {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-danger-soft p-4 text-sm text-danger">
        {lookup.error}
        <Button variant="secondary" size="sm" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }
  return <WordPicker text={lookup.verse.text} range={range} awaitingEnd={awaitingEnd} onChange={onPick} />;
}

export function AddAyahForm({ initial, targetSet }: { initial: { surah: number; ayah: number }; targetSet: TargetSet }) {
  const router = useRouter();
  const [s1, setS1] = useState(initial.surah);
  const [a1, setA1] = useState(initial.ayah);

  const [s2, setS2] = useState(0);
  const [a2, setA2] = useState(0);

  const [chosenSetId, setChosenSetId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [toast, setToast] = useState<Toast>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const key1 = toKey(s1, a1);
  const key2 = s2 && a2 ? toKey(s2, a2) : null;
  const [look1, look1Id, retry1] = useVerseLookup(key1, reload);
  const [look2, look2Id, retry2] = useVerseLookup(key2);

  // Word selections belong to one lookup result: a new ayah (or a reload) starts fresh.
  const [sel1, setSel1] = useState<Selection>(null);
  const [sel2, setSel2] = useState<Selection>(null);
  const matches = look1.status === 'ready' ? look1.sets : [];
  const savedMember =
    look1.status === 'ready' ? matches.flatMap((s) => s.members).find((m) => m.verseKey === look1.verse.key) : undefined;
  // An ayah that is already tracked starts with the words saved for it.
  const saved1: Range = savedMember ? { s: savedMember.phraseStart, e: savedMember.phraseEnd } : null;
  const r1 = sel1?.for === look1Id ? sel1.range : saved1;
  const w1 = sel1?.for === look1Id ? sel1.awaitingEnd : false;
  const r2 = sel2?.for === look2Id ? sel2.range : null;
  const w2 = sel2?.for === look2Id ? sel2.awaitingEnd : false;
  const setR1 = (range: Range, awaitingEnd = false) => setSel1({ for: look1Id, range, awaitingEnd });
  const setR2 = (range: Range, awaitingEnd = false) => setSel2({ for: look2Id, range, awaitingEnd });

  // Keep ?surah=&ayah= in the URL so a reload returns to the same ayah.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('surah', String(s1));
    url.searchParams.set('ayah', String(a1));
    window.history.replaceState(null, '', url);
  }, [s1, a1]);

  const mode: 'target' | 'existing' | 'new' = targetSet ? 'target' : matches.length > 0 ? 'existing' : 'new';
  const inTarget = !!targetSet && targetSet.keys.includes(key1);
  const chosenSet = matches.find((s) => s.id === chosenSetId) ?? matches[0];
  const sameAsFirst = key2 === key1;
  const key2InChosen = !!chosenSet && !!key2 && chosenSet.members.some((m) => m.verseKey === key2);
  const ready1 = look1.status === 'ready' && !!r1;
  const ready2 = !!key2 && look2.status === 'ready' && !!r2 && !sameAsFirst;

  const pick1 = (s: number, a: number) => {
    setS1(s);
    setA1(a);
    setToast(null);
    setError(null);
  };
  const pick2 = (s: number, a: number) => {
    setS2(s);
    setA2(a);
    setError(null);
  };
  const resetStep2 = () => pick2(0, 0);

  const finish = (res: { ok: true; data: { setId: string; title: string } } | { ok: false; error: string }, text: (t: string) => string) => {
    if (!res.ok) return setError(res.error);
    setToast({ text: text(res.data.title), href: `/sets/${res.data.setId}` });
    resetStep2();
    setReload((n) => n + 1);
    router.refresh(); // targetSet keys and the sidebar come from the server
  };

  const submit = (kind: 'solo' | 'pair' | 'toChosen' | 'toTarget') =>
    start(async () => {
      setError(null);
      if (!r1) return;
      const first = { key: key1, s: r1.s, e: r1.e };
      if (kind === 'toTarget' && targetSet) {
        finish(await addMemberToSet({ setId: targetSet.id, ...first }), (t) => `${key1} was added to “${t}”.`);
      } else if (kind === 'toChosen' && chosenSet && key2 && r2) {
        finish(await addMemberToSet({ setId: chosenSet.id, key: key2, s: r2.s, e: r2.e }), (t) => `${key2} was added to “${t}”.`);
      } else if (kind === 'pair' && key2 && r2) {
        finish(await createSet({ members: [first, { key: key2, s: r2.s, e: r2.e }] }), () => `New set created with ${key1} and ${key2}.`);
      } else {
        finish(await createSet({ members: [first] }), () => `${key1} saved. Link a similar ayah any time.`);
      }
    });

  const phrase1 = look1.status === 'ready' && r1 ? phraseText(look1.verse.text, r1.s, r1.e) : null;

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-7">
      {/* Step 1 */}
      <section aria-labelledby="step1" className="flex flex-col gap-[18px] rounded-2xl border border-line bg-surface p-5 md:p-6">
        <StepTitle n={1} id="step1">
          {mode === 'target' ? 'The similar ayah' : 'The ayah you’re reading'}
        </StepTitle>
        <SurahAyahPicker id="first" surah={s1} ayah={a1} onChange={pick1} />

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-full bg-teal-soft px-2.5 py-1 text-sm font-semibold text-teal">{key1}</span>
          <span className="flex-1 text-[13px] text-ink-3">Text from the Quran.com API</span>
          {look1.status === 'ready' &&
            (mode === 'target' ? (
              inTarget && <span className="rounded-full bg-amber-bg px-2.5 py-1 text-[13px] font-semibold text-amber-ink">Already in this set</span>
            ) : matches.length > 0 ? (
              <span className="rounded-full bg-amber-bg px-2.5 py-1 text-[13px] font-semibold text-amber-ink">Already tracked</span>
            ) : (
              <span className="rounded-full bg-muted-bg px-2.5 py-1 text-[13px] font-semibold text-ink-2">Not in any set yet</span>
            ))}
        </div>

        <VerseArea
          lookup={look1}
          retry={retry1}
          range={r1}
          awaitingEnd={w1}
          onPick={(r, w) => (setR1(r, w), setToast(null))}
          emptyText=""
        />

        <div className="flex flex-col gap-1.5 border-t border-muted-bg pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink-2">Similar words you marked</span>
            <button
              type="button"
              onClick={() => setR1(null)}
              className="h-8 cursor-pointer px-2 text-[13px] font-semibold text-teal"
            >
              Clear
            </button>
          </div>
          <p lang="ar" className="quran min-h-11 text-[22px] leading-[2]">
            {phrase1 ?? <span className="font-sans text-sm text-ink-3">Nothing marked yet</span>}
          </p>
        </div>
      </section>

      {/* Right column */}
      <div className="flex flex-col gap-5">
        {mode === 'target' && targetSet && (
          <section className="flex flex-col gap-2 rounded-2xl border border-teal-line bg-teal-soft px-6 py-5">
            <h2 className="text-[17px] font-semibold text-teal-dark">Adding to “{targetSet.title}”</h2>
            <p className="text-sm text-teal-dark">Already in this set: {targetSet.keys.join(' · ')}</p>
          </section>
        )}

        {mode === 'existing' && (
          <section aria-label="Already tracked" className="flex flex-col gap-3.5 rounded-2xl border border-teal-line bg-teal-soft px-5 py-5 md:px-6">
            {matches.map((set) => (
              <div key={set.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircleIcon size={22} className="shrink-0 text-teal" />
                  <h2 className="text-[17px] font-semibold text-teal-dark">
                    {key1} is already in “{set.title}”
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  {set.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-[10px] bg-surface px-3.5 py-2.5">
                      <span className="w-14 text-sm font-semibold text-teal">{m.verseKey}</span>
                      <span lang="ar" className="quran flex-1 truncate text-[19px] leading-[1.9]">
                        {m.phraseText}
                      </span>
                    </div>
                  ))}
                </div>
                <ButtonLink href={`/sets/${set.id}`} size="sm" className="self-start">
                  Open set to compare
                </ButtonLink>
              </div>
            ))}
          </section>
        )}

        {mode !== 'target' && (
          <section aria-labelledby="step2" className="flex flex-col gap-[18px] rounded-2xl border border-line bg-surface p-5 md:p-6">
            <div className="flex flex-col gap-1">
              <StepTitle n={2} id="step2">
                {mode === 'existing' ? 'Add another similar ayah to this set' : 'Link a similar ayah'}
              </StepTitle>
              <p className="ml-[38px] text-sm text-ink-2">
                {mode === 'existing'
                  ? 'Found one more place with the same wording? Add it here.'
                  : 'Optional. You can also save this ayah alone and link it later.'}
              </p>
            </div>

            {mode === 'existing' && matches.length > 1 && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-[13px] font-medium text-ink-2">Add to which set?</legend>
                {matches.map((s) => (
                  <label key={s.id} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2 hover:bg-surface-2">
                    <input
                      type="radio"
                      name="target-set"
                      checked={chosenSet?.id === s.id}
                      onChange={() => setChosenSetId(s.id)}
                      className="size-4 accent-teal"
                    />
                    <span className="text-sm font-medium">{s.title}</span>
                  </label>
                ))}
              </fieldset>
            )}

            <SurahAyahPicker id="second" surah={s2} ayah={a2} onChange={pick2} optional />
            <VerseArea
              lookup={look2}
              retry={retry2}
              range={r2}
              awaitingEnd={w2}
              onPick={(r, w) => setR2(r, w)}
              emptyText="Choose a surah and ayah to load its text."
            />
            {sameAsFirst && <p className="text-sm text-danger">Pick a different ayah from the one in step 1.</p>}
            {key2InChosen && <p className="text-sm text-danger">{key2} is already in this set.</p>}
          </section>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {toast ? (
          <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl bg-ink px-5 py-4 text-[15px] text-white">
            <CheckIcon size={20} className="text-[#8fd1c6]" />
            <span className="flex-1">{toast.text}</span>
            <Link href={toast.href} className="font-semibold text-[#8fd1c6] hover:text-white">
              View set
            </Link>
          </div>
        ) : (
          <div className={clsx('flex flex-wrap justify-end gap-3', pending && 'opacity-70')}>
            {mode === 'target' && (
              <Button onClick={() => submit('toTarget')} disabled={pending || !ready1 || inTarget}>
                Add to this set
              </Button>
            )}
            {mode === 'existing' && (
              <Button onClick={() => submit('toChosen')} disabled={pending || !ready1 || !ready2 || key2InChosen}>
                Add to this set
              </Button>
            )}
            {mode === 'new' && (
              <>
                <Button variant="secondary" onClick={() => submit('solo')} disabled={pending || !ready1}>
                  Save this ayah only
                </Button>
                <Button onClick={() => submit('pair')} disabled={pending || !ready1 || !ready2}>
                  {key2 && !sameAsFirst ? `Create set with ${key1} and ${key2}` : 'Create set'}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
