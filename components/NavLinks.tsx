'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/sets', label: 'Sets' },
  { href: '/add', label: 'Add ayah' },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden gap-1 md:flex">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + '/');
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'rounded-lg px-3.5 py-2.5 text-[15px] no-underline',
              active ? 'bg-teal-soft font-semibold text-teal' : 'font-medium text-ink-2 hover:text-ink',
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
