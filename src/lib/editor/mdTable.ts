/** GFM 表格解析与编辑（按行操作，对齐分隔行） */

export type ColAlign = "left" | "center" | "right" | "none";

export interface MdTableBlock {
  /** inclusive start line index (0-based) */
  start: number;
  /** exclusive end line index */
  end: number;
  lines: string[];
  colCount: number;
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isSepRow(line: string): boolean {
  const cells = splitRow(line);
  if (cells.length === 0) return false;
  // GFM：至少一根横线即可（`:---` / `---` / `:-:`）
  return cells.every((c) => /^:?-+:?$/.test(c) && c.replace(/:/g, "").length >= 1);
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.includes("|") && !t.startsWith("```");
}

function alignOfSep(cell: string): ColAlign {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return "none";
}

function sepForAlign(align: ColAlign): string {
  switch (align) {
    case "left":
      return ":---";
    case "center":
      return ":---:";
    case "right":
      return "---:";
    default:
      return "---";
  }
}

function joinRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

export function findTableAtLine(
  docLines: string[],
  lineIndex: number,
): MdTableBlock | null {
  if (lineIndex < 0 || lineIndex >= docLines.length) return null;
  if (!isTableRow(docLines[lineIndex]!)) return null;

  let start = lineIndex;
  while (start > 0 && isTableRow(docLines[start - 1]!)) start -= 1;
  let end = lineIndex + 1;
  while (end < docLines.length && isTableRow(docLines[end]!)) end += 1;

  const lines = docLines.slice(start, end);
  if (lines.length < 2) return null;
  if (!isSepRow(lines[1]!)) return null;

  const colCount = Math.max(...lines.map((l) => splitRow(l).length));
  return { start, end, lines, colCount };
}

export function getColumnAlign(table: MdTableBlock, col: number): ColAlign {
  const sep = splitRow(table.lines[1]!);
  const cell = sep[col] ?? "---";
  return alignOfSep(cell);
}

export function setColumnAlign(
  table: MdTableBlock,
  col: number,
  align: ColAlign,
): MdTableBlock {
  const lines = [...table.lines];
  const sep = splitRow(lines[1]!);
  while (sep.length < table.colCount) sep.push("---");
  if (col >= 0 && col < sep.length) sep[col] = sepForAlign(align);
  lines[1] = joinRow(sep);
  return { ...table, lines };
}

function padRow(cells: string[], cols: number): string[] {
  const next = [...cells];
  while (next.length < cols) next.push("");
  return next.slice(0, cols);
}

export function insertRow(
  table: MdTableBlock,
  at: number,
): MdTableBlock {
  // at: 0 = after header+sep insert as first body? rows: 0 header, 1 sep, 2+ body
  const lines = [...table.lines];
  const empty = joinRow(Array.from({ length: table.colCount }, () => ""));
  const idx = Math.max(2, Math.min(at, lines.length));
  lines.splice(idx, 0, empty);
  return { ...table, lines, end: table.start + lines.length };
}

export function insertColumn(
  table: MdTableBlock,
  at: number,
): MdTableBlock {
  const lines = table.lines.map((line, i) => {
    const cells = padRow(splitRow(line), table.colCount);
    const idx = Math.max(0, Math.min(at, cells.length));
    cells.splice(idx, 0, i === 1 ? "---" : "");
    return joinRow(cells);
  });
  return {
    ...table,
    lines,
    colCount: table.colCount + 1,
    end: table.start + lines.length,
  };
}

export function deleteColumn(table: MdTableBlock, col: number): MdTableBlock | null {
  if (table.colCount <= 1) return null;
  const lines = table.lines.map((line) => {
    const cells = padRow(splitRow(line), table.colCount);
    cells.splice(col, 1);
    return joinRow(cells);
  });
  return {
    ...table,
    lines,
    colCount: table.colCount - 1,
    end: table.start + lines.length,
  };
}

export function moveRow(table: MdTableBlock, from: number, to: number): MdTableBlock {
  // only body rows (>=2)
  if (from < 2 || to < 2 || from >= table.lines.length || to >= table.lines.length) {
    return table;
  }
  const lines = [...table.lines];
  const [row] = lines.splice(from, 1);
  lines.splice(to, 0, row!);
  return { ...table, lines };
}

export function moveColumn(
  table: MdTableBlock,
  from: number,
  to: number,
): MdTableBlock {
  if (
    from < 0 ||
    to < 0 ||
    from >= table.colCount ||
    to >= table.colCount ||
    from === to
  ) {
    return table;
  }
  const lines = table.lines.map((line) => {
    const cells = padRow(splitRow(line), table.colCount);
    const [c] = cells.splice(from, 1);
    cells.splice(to, 0, c!);
    return joinRow(cells);
  });
  return { ...table, lines };
}

export function formatTable(table: MdTableBlock): MdTableBlock {
  const rows = table.lines.map((l) => padRow(splitRow(l), table.colCount));
  const widths = Array.from({ length: table.colCount }, (_, i) =>
    Math.max(3, ...rows.map((r) => (r[i] ?? "").length)),
  );
  const lines = rows.map((cells, ri) => {
    const padded = cells.map((c, i) => {
      if (ri === 1) {
        const align = alignOfSep(c || "---");
        const w = widths[i]!;
        if (align === "center") return `:${"-".repeat(Math.max(1, w - 2))}:`;
        if (align === "right") return `${"-".repeat(Math.max(1, w - 1))}:`;
        if (align === "left") return `:${"-".repeat(Math.max(1, w - 1))}`;
        return "-".repeat(w);
      }
      return (c ?? "").padEnd(widths[i]!);
    });
    return joinRow(padded);
  });
  return { ...table, lines };
}

export function applyTableToDoc(
  doc: string,
  table: MdTableBlock | null,
  mode: "replace" | "delete",
): string {
  const lines = doc.split(/\r\n|\r|\n/);
  if (!table) return doc;
  const next =
    mode === "delete"
      ? [...lines.slice(0, table.start), ...lines.slice(table.end)]
      : [
          ...lines.slice(0, table.start),
          ...table.lines,
          ...lines.slice(table.end),
        ];
  return next.join("\n");
}

/** 根据光标行与列偏移估计列索引（粗略：数当前行 `|`） */
export function estimateColIndex(line: string, colOffset: number): number {
  const left = line.slice(0, colOffset);
  const pipes = (left.match(/\|/g) ?? []).length;
  // leading | counts as 0th boundary
  return Math.max(0, pipes - (line.trimStart().startsWith("|") ? 1 : 0));
}

export function cellColumnFromDom(td: Element): number {
  const tr = td.closest("tr");
  if (!tr) return 0;
  const cells = Array.from(tr.children).filter(
    (el) => el.tagName === "TD" || el.tagName === "TH",
  );
  return Math.max(0, cells.indexOf(td as HTMLElement));
}
