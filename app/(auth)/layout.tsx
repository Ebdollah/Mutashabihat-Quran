import { BrandLockup } from '@/components/Logo';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <BrandLockup size={80} />
      <div className="w-full max-w-[400px] rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_3px_rgba(29,27,23,0.06)] md:p-8">
        {children}
      </div>
    </main>
  );
}
