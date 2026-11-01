/**
 * 解析围栏 info：语言 + 可选行高亮。
 * 支持 `ts{1,3-5}` / `ts {1,3-5}` / `javascript{2}`。
 */
export function parseHighlightRanges(spec: string): number[] {
  const out = new Set<number>();
  for (const part of spec.split(",")) {
    const p = part.trim();
    if (!p) continue;
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(p);
    if (!m) continue;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    // 防极端：单段最多 2000 行
    const end = Math.min(hi, lo + 1999);
    for (let i = lo; i <= end; i++) {
      if (i >= 1) out.add(i);
    }
  }
  return [...out].sort((x, y) => x - y);
}

export function parseFenceInfo(info: string): {
  lang: string;
  highlightLines: number[];
} {
  const trimmed = info.trim();
  if (!trimmed) return { lang: "", highlightLines: [] };

  const brace = /\{([^}]*)\}\s*$/.exec(trimmed);
  let highlightLines: number[] = [];
  let langPart = trimmed;
  if (brace) {
    highlightLines = parseHighlightRanges(brace[1] ?? "");
    langPart = trimmed.slice(0, brace.index).trim();
  }

  const lang = (langPart.split(/\s+/)[0] ?? "").replace(/^language-/, "");
  return { lang, highlightLines };
}

/** 压缩行号列表为 `1,3-5` */
export function formatHighlightRanges(lines: readonly number[]): string {
  const sorted = [
    ...new Set(lines.filter((n) => Number.isFinite(n) && n >= 1).map((n) => Math.floor(n))),
  ].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j += 1;
    parts.push(j === i ? String(sorted[i]) : `${sorted[i]}-${sorted[j]}`);
    i = j + 1;
  }
  return parts.join(",");
}

/** 拼回围栏 info：`ts{1,3-5}`；无高亮时仅语言 */
export function formatFenceInfo(
  lang: string,
  highlightLines: readonly number[],
): string {
  const base = lang.trim().replace(/^language-/, "");
  const spec = formatHighlightRanges(highlightLines);
  if (!spec) return base;
  return base ? `${base}{${spec}}` : `{${spec}}`;
}
