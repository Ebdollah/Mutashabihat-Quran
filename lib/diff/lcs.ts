/**
 * Word-level comparison of similar ayahs.
 *
 * lcsMask(a, b)[i] is true when a[i] belongs to a longest common subsequence of a and b.
 * Using an LCS (rather than "does the word appear anywhere") also catches changes in word order,
 * e.g. وَقُولُوا۟ حِطَّةٌ before or after ٱدْخُلُوا۟ ٱلْبَابَ سُجَّدًا in 2:58 vs 7:161.
 */
export function lcsMask(a: string[], b: string[]): boolean[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const mask = new Array<boolean>(n).fill(false);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      mask[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return mask;
}

/**
 * For each word list, marks which words are shared with EVERY other list (true = common, false = differs).
 * With a single list everything counts as common.
 */
export function commonMasks(lists: string[][]): boolean[][] {
  return lists.map((words, xi) => {
    let mask = words.map(() => true);
    lists.forEach((other, yi) => {
      if (yi === xi) return;
      const m = lcsMask(words, other);
      mask = mask.map((c, i) => c && m[i]);
    });
    return mask;
  });
}
