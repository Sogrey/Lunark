export interface TocItem {
  id: string;
  level: number;
  text: string;
  /** 1-based line number in the full source */
  line: number;
}

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

/**
 * 从 Markdown 源码提取标题大纲（跳过 YAML front-matter 与围栏代码块）。
 */
export function extractToc(source: string): TocItem[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const items: TocItem[] = [];
  const used = new Map<string, number>();
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

    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!heading) continue;

    const level = heading[1]!.length;
    const rawText = heading[2]!.replace(/\s+#+\s*$/, "").trim();
    const text = stripInlineMarkdown(rawText);
    if (!text) continue;

    items.push({
      id: slugifyHeading(text, used),
      level,
      text,
      line: i + 1,
    });
  }

  return items;
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
