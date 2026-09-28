import clsx from 'clsx';
import Link from 'next/link';
import type { ComponentProps } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-line-2 disabled:text-ink-2 disabled:border-transparent cursor-pointer';
const variants: Record<Variant, string> = {
  primary: 'bg-teal text-white hover:bg-teal-dark',
  secondary: 'border border-line-2 bg-surface text-ink font-medium hover:bg-surface-2',
  outline: 'border border-teal text-teal hover:bg-teal-soft',
  ghost: 'text-teal hover:bg-teal-soft',
  danger: 'bg-danger text-white hover:bg-[#7c2218]',
};
const sizes = { md: 'h-12 px-5', sm: 'h-10 px-4 text-sm' };

export function buttonClass(variant: Variant = 'primary', size: keyof typeof sizes = 'md', className?: string) {
  return clsx(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ComponentProps<'button'> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
