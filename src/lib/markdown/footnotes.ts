/**
 * GFM 脚注：`[^id]` / `[^id]: …`
 * id 可为数字或任意标签（如 note、ref-a），插入时避开文档已有 id。
 *
 * Crepe/CommonMark 会把 `[^id]: …` 当成链接引用定义吃掉，
 * 混合模式加载时在 `]` 与 `:` 之间插入 ZWSP，落盘再去掉。
 */

const FOOTNOTE_ID_RE = /\[\^([^\]]+)\]/g;

/** 防 CommonMark link definition 误解析 */
export const FOOTNOTE_DEF_ZWSP = "\u200B";

export function collectFootnoteIds(md: string): Set<string> {
  const ids = new Set<string>();
  for (const m of md.matchAll(FOOTNOTE_ID_RE)) {
    const id = (m[1] ?? "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

/** 下一个未占用 id：优先最小正整数，改成 note / a 等任意标签亦可 */
export function nextFootnoteId(md: string): string {
  const ids = collectFootnoteIds(md);
  let n = 1;
  while (ids.has(String(n))) n += 1;
  return String(n);
}

export function footnoteSnippet(id: string, body: string): string {
  const safe = id.trim() || "1";
  return `[^${safe}]\n\n[^${safe}]: ${body}\n`;
}

export function isFootnoteSnippet(md: string): boolean {
  return /^\[\^[^\]]+\]\s*\n\s*\n\s*\[\^[^\]]+\]:/m.test(
    md.replace(/\r\n/g, "\n").trim(),
  );
}

/** 喂给 Crepe：保护脚注定义行，避免被解析成 link definition */
export function footnotesToHybrid(md: string): string {
  return md.replace(
    /^([ \t]{0,3}\[\^[^\]]+\])([ \t]*):/gm,
    `$1$2${FOOTNOTE_DEF_ZWSP}:`,
  );
}

/** 写回 Tab / 源码：去掉保护符 */
export function hybridFootnotesToCanonical(md: string): string {
  return md.replace(
    /^([ \t]{0,3}\[\^[^\]]+\])([ \t]*)\u200B:/gm,
    "$1$2:",
  );
}
