export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-[28px] font-semibold tracking-[-0.01em]">Mutashabihat</span>
        <span lang="ar" dir="rtl" className="font-quran text-2xl text-teal">
          متشابهات
        </span>
      </div>
      <div className="w-full max-w-[400px] rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_3px_rgba(29,27,23,0.06)] md:p-8">
        {children}
      </div>
    </main>
  );
}
