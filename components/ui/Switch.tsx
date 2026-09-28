import clsx from 'clsx';

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex h-10 cursor-pointer items-center gap-2.5 px-1 text-sm font-medium text-ink"
    >
      <span
        className={clsx(
          'flex h-6 w-10 rounded-full p-[3px] transition-colors',
          checked ? 'justify-end bg-teal' : 'justify-start bg-[#c9c2b3]',
        )}
      >
        <span className="size-[18px] rounded-full bg-white" />
      </span>
      {label}
    </button>
  );
}
