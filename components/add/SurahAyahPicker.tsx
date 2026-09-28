import { SURAHS, getSurah } from '@/lib/quran/surahs';

const selectCls =
  'h-[46px] w-full rounded-[10px] border border-line-2 bg-surface px-3 text-[15px] text-ink outline-none focus:border-teal';

/** Surah + ayah dropdowns. surah/ayah = 0 means "nothing chosen" (only when `optional`). */
export function SurahAyahPicker({
  id,
  surah,
  ayah,
  onChange,
  optional = false,
}: {
  id: string;
  surah: number;
  ayah: number;
  onChange: (surah: number, ayah: number) => void;
  optional?: boolean;
}) {
  const count = getSurah(surah)?.verses ?? 0;
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="col-span-2 flex flex-col gap-1.5">
        <label htmlFor={`${id}-surah`} className="text-[13px] font-medium text-ink-2">
          Surah
        </label>
        <select
          id={`${id}-surah`}
          className={selectCls}
          value={surah}
          onChange={(e) => {
            const s = Number(e.target.value);
            onChange(s, optional ? 0 : 1);
          }}
        >
          {optional && <option value={0}>Choose a surah</option>}
          {SURAHS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id}. {s.nameEn} — {s.nameAr}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-ayah`} className="text-[13px] font-medium text-ink-2">
          Ayah
        </label>
        <select
          id={`${id}-ayah`}
          className={selectCls}
          value={ayah}
          disabled={!surah}
          onChange={(e) => onChange(surah, Number(e.target.value))}
        >
          {optional && <option value={0}>—</option>}
          {Array.from({ length: count }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
