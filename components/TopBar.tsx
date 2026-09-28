import Link from 'next/link';
import { auth } from '@/auth';
import { logoutAction } from '@/lib/actions/auth';
import { LogoutIcon, PlusIcon } from '@/components/ui/icons';
import { NavLinks } from './NavLinks';

export async function TopBar() {
  const session = await auth();
  const who = session?.user?.name || session?.user?.email;

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-4 border-b border-line bg-surface-2 px-4 md:h-[68px] md:gap-8 md:px-8">
      <Link href="/sets" className="flex items-baseline gap-2.5 text-ink no-underline">
        <span className="font-display text-[21px] font-semibold tracking-[-0.01em] md:text-2xl">Mutashabihat</span>
        <span lang="ar" dir="rtl" className="hidden font-quran text-xl text-teal sm:inline">
          متشابهات
        </span>
      </Link>
      <NavLinks />
      <div className="ml-auto flex items-center gap-2">
        {who && <span className="hidden max-w-56 truncate text-sm text-ink-2 lg:inline">{who}</span>}
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2"
          >
            <LogoutIcon size={16} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </form>
        <Link
          href="/add"
          aria-label="Add ayah"
          className="flex size-11 items-center justify-center rounded-[10px] bg-teal text-white md:hidden"
        >
          <PlusIcon size={20} />
        </Link>
      </div>
    </header>
  );
}
