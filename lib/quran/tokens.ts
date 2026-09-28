/** Waqf / pause marks (ۖ ۗ ۘ ۙ ۚ ۛ ۜ ۞ ۩). In text_uthmani they arrive as their own space-separated tokens. */
export const WAQF = /^[ۖ-ۜ۞۩]+$/;

export const tokenize = (text: string) => text.split(' ').filter(Boolean);
export const isWaqf = (token: string) => WAQF.test(token);

/** Words from index s to e (inclusive) of the ayah, indices counted over tokenize(text). */
export function phraseText(text: string, s: number, e: number): string {
  return tokenize(text).slice(s, e + 1).join(' ');
}

/** Checks a phrase range against an ayah: in bounds, ordered, and not starting/ending on a waqf mark. */
export function isValidPhrase(text: string, s: number, e: number): boolean {
  const t = tokenize(text);
  return (
    Number.isInteger(s) && Number.isInteger(e) &&
    s >= 0 && e >= s && e < t.length &&
    !isWaqf(t[s]) && !isWaqf(t[e])
  );
}

/** True when a string is mostly Arabic script (e.g. a set title made from the phrase). */
export const isArabicText = (s: string) => /^[\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF.…·]+$/.test(s);
