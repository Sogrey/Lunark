export interface TocItem {
  id: string;
  level: number;
  text: string;
  /** 1-based line number in the full source */
  line: number;
}

/** `## Title {#custom-id}` 尾部自定义锚点（方言） */
const CUSTOM_ANCHOR_RE = /\s*\{#([A-Za-z][\w:-]*)\}\s*$/;

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .trim();
}

/** 解析标题行：去掉尾部 `{#id}`，返回可见文本与可选自定义 id */
export function parseHeadingLine(rawLine: string): {
  level: number;
  text: string;
  customId: string | null;
} | null {
  const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(rawLine);
  if (!heading) return null;
  const level = heading[1]!.length;
  let rawText = heading[2]!.replace(/\s+#+\s*$/, "").trim();
  let customId: string | null = null;
  const anchor = CUSTOM_ANCHOR_RE.exec(rawText);
  if (anchor) {
    customId = anchor[1]!;
    rawText = rawText.slice(0, anchor.index).trim();
  }
  const text = stripInlineMarkdown(rawText);
  if (!text && !customId) return null;
  return { level, text: text || customId!, customId };
}

export function slugifyHeading(text: string, used: Map<string, number>): string {
  let base = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!base) base = "heading";

  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

function uniquifyId(id: string, used: Map<string, number>): string {
  const count = used.get(id) ?? 0;
  used.set(id, count + 1);
  return count === 0 ? id : `${id}-${count}`;
}

type LineVisitor = (line: string, lineIndex: number) => string | void;

/** 跳过 front matter / 围栏，逐行访问正文 */
function mapBodyLines(source: string, visit: LineVisitor): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let inFence = false;
  let fenceChar = "";
  let fenceLen = 0;
  let inFrontMatter = lines[0]?.trim() === "---";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    if (inFrontMatter) {
      if (i > 0 && line.trim() === "---") {
        inFrontMatter = false;
      }
      continue;
    }

    const fenceMatch = /^(```+|~~~+)/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1]!;
      const ch = marker[0]!;
      const len = marker.length;
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
        fenceLen = len;
      } else if (
        ch === fenceChar &&
        len >= fenceLen &&
        /^[`~]+\s*$/.test(line.trim())
      ) {
        inFence = false;
        fenceChar = "";
        fenceLen = 0;
      }
      continue;
    }
    if (inFence) continue;

    const next = visit(line, i);
    if (typeof next === "string") lines[i] = next;
  }

  return lines.join("\n");
}

/**
 * 从 Markdown 源码提取标题大纲（跳过 YAML front-matter 与围栏代码块）。
 * 支持 `## 标题 {#custom-id}`。
 */
export function extractToc(source: string): TocItem[] {
  const items: TocItem[] = [];
  const used = new Map<string, number>();

  mapBodyLines(source, (line, i) => {
    const parsed = parseHeadingLine(line);
    if (!parsed) return;
    const id = parsed.customId
      ? uniquifyId(parsed.customId, used)
      : slugifyHeading(parsed.text, used);
    items.push({
      id,
      level: parsed.level,
      text: parsed.text,
      line: i + 1,
    });
  });

  return items;
}

/**
 * 渲染前去掉标题尾部 `{#id}`，避免预览正文露出标记；
 * TOC / 预览 id 仍由 extractToc + applyTocIdsToHtml 对齐。
 */
export function stripHeadingAnchorMarkers(source: string): string {
  return mapBodyLines(source, (line) => {
    const parsed = parseHeadingLine(line);
    if (!parsed?.customId) return;
    const hashes = "#".repeat(parsed.level);
    // 保留原始行内 MD，仅剥锚点
    const withoutAnchor = line.replace(CUSTOM_ANCHOR_RE, "").replace(/\s+$/, "");
    const rest = withoutAnchor.replace(/^#{1,6}\s+/, "");
    return `${hashes} ${rest}`;
  });
}

/** 给预览 HTML 中的 h1–h6 按出现顺序写入与 TOC 一致的 id */
export function applyTocIdsToHtml(html: string, toc: TocItem[]): string {
  if (!html || toc.length === 0) return html;
  let index = 0;
  return html.replace(/<(h[1-6])(\s[^>]*)?>/gi, (full, tag: string, attrs = "") => {
    if (index >= toc.length) return full;
    const item = toc[index]!;
    index += 1;
    if (/\sid\s*=/.test(attrs)) {
      return `<${tag}${attrs.replace(/\sid\s*=\s*(["']).*?\1/i, ` id="${item.id}"`)}>`;
    }
    return `<${tag} id="${item.id}"${attrs}>`;
  });
}
