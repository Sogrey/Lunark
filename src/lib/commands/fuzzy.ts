/** 简易模糊：query 字符按序出现在 text 中即命中；返回分数越高越好。 */
export function fuzzyScore(text: string, query: string): number {
  const hay = text.toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!needle) return 1;
  if (hay.includes(needle)) {
    return 1000 - hay.indexOf(needle) + Math.min(needle.length, 50);
  }
  let hi = 0;
  let score = 0;
  let consecutive = 0;
  for (let ni = 0; ni < needle.length; ni++) {
    const ch = needle[ni]!;
    const found = hay.indexOf(ch, hi);
    if (found < 0) return 0;
    if (found === hi) {
      consecutive += 1;
      score += 8 + consecutive;
    } else {
      consecutive = 0;
      score += 2;
    }
    hi = found + 1;
  }
  return score;
}

export function fuzzyFilter<T>(
  items: readonly T[],
  query: string,
  getText: (item: T) => string,
): T[] {
  const q = query.trim();
  if (!q) return [...items];
  const scored = items
    .map((item) => ({ item, score: fuzzyScore(getText(item), q) }))
    .filter((x) => x.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.item);
}
