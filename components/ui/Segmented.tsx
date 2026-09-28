import clsx from 'clsx';

type Option<T extends string> = { value: T; label: string };

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={clsx('flex rounded-[10px] bg-muted-bg p-[3px]', className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={clsx(
              'h-9 flex-1 cursor-pointer rounded-lg px-3.5 text-sm whitespace-nowrap',
              on ? 'bg-surface font-semibold text-teal shadow-[0_1px_2px_rgba(29,27,23,0.12)]' : 'font-medium text-ink-2 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
