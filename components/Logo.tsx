import Image from 'next/image';

/**
 * The Mutashabihat mark: Solomon's knot in a medallion. Below 64 px it switches to the
 * simplified drawing (one ring, no beads, larger knot) so it stays legible.
 * Decorative by default: it always sits next to the written name.
 */
export function Logo({ size, className, alt = '' }: { size: number; className?: string; alt?: string }) {
  return (
    <Image
      src={size > 64 ? '/brand/logo.svg' : '/brand/logo-small.svg'}
      width={size}
      height={size}
      alt={alt}
      className={className}
      priority
    />
  );
}

/** The mark above the name in English and Arabic: for the login page and the loading screen. */
export function BrandLockup({ size = 88 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Logo size={size} />
      <div className="flex flex-col items-center">
        <span className="font-display text-[28px] font-semibold tracking-[-0.01em] leading-tight">Mutashabihat</span>
        <span lang="ar" dir="rtl" className="font-quran text-2xl leading-[1.9] text-teal">
          متشابهات
        </span>
      </div>
    </div>
  );
}
