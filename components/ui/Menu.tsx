'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { MoreIcon } from './icons';

export type MenuItem = { label: string; icon?: React.ReactNode; onSelect: () => void; danger?: boolean; href?: string };

/** Small "⋯" dropdown. Closes on outside click and Escape. */
export function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-ink-3 hover:bg-muted-bg hover:text-ink"
      >
        <MoreIcon />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-10 right-0 z-20 flex min-w-52 flex-col rounded-xl border border-line bg-surface p-1.5 shadow-[0_8px_24px_rgba(29,27,23,0.12)]"
        >
          {items.map((it) => {
            const cls = clsx(
              'flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium no-underline',
              it.danger ? 'text-danger hover:bg-danger-soft' : 'text-ink hover:bg-surface-2',
            );
            return it.href ? (
              <a key={it.label} role="menuitem" href={it.href} target="_blank" rel="noreferrer" className={cls} onClick={() => setOpen(false)}>
                {it.icon}
                {it.label}
              </a>
            ) : (
              <button
                key={it.label}
                role="menuitem"
                type="button"
                className={cls}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
              >
                {it.icon}
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
