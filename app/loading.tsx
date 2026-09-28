import { BrandLockup } from '@/components/Logo';

// Shown on the first load while a page streams in: the mark with the name in English and Arabic.
export default function Loading() {
  return (
    <main role="status" className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="motion-safe:animate-pulse">
        <BrandLockup size={96} />
      </div>
      <span className="sr-only">Loading…</span>
    </main>
  );
}
