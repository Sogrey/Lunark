/**
 * 从剪贴板识别表格（TSV / 简易 CSV / HTML table）→ GFM Markdown。
 */

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function rowsToGfm(rows: string[][]): string | null {
  if (rows.length === 0) return null;
  const cols = Math.max(...rows.map((r) => r.length));
  if (cols < 2 || rows.length < 1) return null;
  const padded = rows.map((r) => {
    const cells = r.map(escapeCell);
    while (cells.length < cols) cells.push("");
    return cells.slice(0, cols);
  });
  const head = padded[0]!;
  const sep = Array.from({ length: cols }, () => "---");
  const body = padded.slice(1);
  const lines = [
    `| ${head.join(" | ")} |`,
    `| ${sep.join(" | ")} |`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
  ];
  return lines.join("\n");
}

function parseDelimited(text: string, delim: string | RegExp): string[][] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map((line) =>
      typeof delim === "string"
        ? line.split(delim)
        : line.split(delim),
    )
    .map((cells) => cells.map((c) => c.trim()));
}

function looksLikeGrid(rows: string[][]): boolean {
  if (rows.length < 2) return false;
  const cols = rows[0]!.length;
  if (cols < 2) return false;
  const consistent = rows.filter((r) => r.length === cols).length;
  return consistent >= Math.ceil(rows.length * 0.7);
}

/** 无 DOM 时的简易回退（单测 / Node） */
function parseHtmlTableRegex(html: string): string[][] | null {
  const rows: string[][] = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(html))) {
    const cells: string[] = [];
    const cellRe = /<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;
    let cell: RegExpExecArray | null;
    while ((cell = cellRe.exec(tr[1]!))) {
      cells.push(
        cell[1]!
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/gi, " ")
          .replace(/\s+/g, " ")
          .trim(),
      );
    }
    if (cells.length) rows.push(cells);
  }
  return rows.length ? rows : null;
}

/** HTML `<table>` → 行列 */
export function parseHtmlTable(html: string): string[][] | null {
  if (!/<table[\s>]/i.test(html)) return null;
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const table = doc.querySelector("table");
      if (!table) return null;
      const rows: string[][] = [];
      for (const tr of Array.from(table.querySelectorAll("tr"))) {
        const cells = Array.from(tr.querySelectorAll("th,td")).map(
          (c) => c.textContent?.replace(/\s+/g, " ").trim() ?? "",
        );
        if (cells.length) rows.push(cells);
      }
      if (rows.length) return rows;
    } catch {
      /* fall through */
    }
  }
  return parseHtmlTableRegex(html);
}

/**
 * 若文本/HTML 像表格则返回 GFM，否则 null。
 */
export function clipboardToMarkdownTable(
  text: string,
  html?: string | null,
): string | null {
  if (html) {
    const fromHtml = parseHtmlTable(html);
    if (fromHtml && looksLikeGrid(fromHtml)) {
      return rowsToGfm(fromHtml);
    }
  }

  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return null;

  // 已是 GFM 表：原样（略作规范化留给 format）
  if (/^\|.+\|/m.test(raw) && /\|[\t ]*:?-{3,}/.test(raw)) {
    return raw;
  }

  if (raw.includes("\t")) {
    const rows = parseDelimited(raw, "\t");
    if (looksLikeGrid(rows)) return rowsToGfm(rows);
  }

  // 多行且多数含逗号 → CSV
  const lines = raw.split(/\n/).filter((l) => l.trim());
  if (lines.length >= 2 && lines.filter((l) => l.includes(",")).length >= 2) {
    const rows = parseDelimited(raw, ",");
    if (looksLikeGrid(rows)) return rowsToGfm(rows);
  }

  return null;
}
