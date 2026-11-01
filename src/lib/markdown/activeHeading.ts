/** 相对滚动容器顶部的偏移：落在此线上方的最后一个标题视为当前节。 */
export const ACTIVE_HEADING_OFFSET_PX = 48;

/**
 * 根据标题相对滚动容器顶部的位置，解析当前大纲高亮 id。
 * `tops` 须按文档顺序，且为相对容器顶部的像素（getBoundingClientRect 差值）。
 */
export function resolveActiveHeadingId(
  headings: ReadonlyArray<{ id: string; top: number }>,
  offsetPx: number = ACTIVE_HEADING_OFFSET_PX,
): string | null {
  if (headings.length === 0) return null;

  let current: string | null = null;
  for (const h of headings) {
    if (!h.id) continue;
    if (h.top <= offsetPx) current = h.id;
    else break;
  }

  if (current) return current;

  // 文首：第一个标题尚在视口上半时也高亮
  const first = headings.find((h) => h.id);
  if (first && first.top < offsetPx + 360) return first.id;
  return null;
}
