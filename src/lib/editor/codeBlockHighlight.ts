/**
 * 代码块行高亮：在围栏 info 写入 `{1,3-5}`（源码 CM / 混合 Crepe 共用）。
 */
import type { EditorView as CmView } from "@codemirror/view";
import type { EditorView as PmView } from "@milkdown/kit/prose/view";
import { isContainerKind } from "@/lib/markdown/containers";
import {
  formatFenceInfo,
  parseFenceInfo,
} from "@/lib/markdown/fenceInfo";

export type CodeBlockHighlightState = {
  /** 可设高亮的普通代码块（非 tip/mermaid/公式） */
  highlightable: boolean;
  language: string;
  highlightLines: number[];
  /** 选区覆盖的块内行号（1-based）；折叠光标则为当前行 */
  selectedLines: number[];
};

const SKIP_LANG = new Set(["mermaid", "latex", "math"]);

export function isHighlightableCodeLang(raw: string): boolean {
  const { lang } = parseFenceInfo(raw);
  const key = lang.toLowerCase();
  if (!key) return true;
  if (isContainerKind(key)) return false;
  if (SKIP_LANG.has(key)) return false;
  return true;
}

function linesBetween(start: number, end: number): number[] {
  if (start > end) return [];
  const out: number[] = [];
  for (let n = start; n <= end; n++) out.push(n);
  return out;
}

function offsetToLine(text: string, offset: number): number {
  const o = Math.max(0, Math.min(text.length, offset));
  if (o === 0) return 1;
  return text.slice(0, o).split("\n").length;
}

function selectedLinesInText(
  text: string,
  fromOff: number,
  toOff: number,
): number[] {
  if (!text.length) return [1];
  const a = Math.max(0, Math.min(text.length, fromOff));
  const b = Math.max(0, Math.min(text.length, toOff));
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const startLine = offsetToLine(text, lo);
  const endLine =
    hi <= lo ? startLine : offsetToLine(text, Math.max(0, hi - 1));
  const total = Math.max(1, text.split("\n").length);
  return linesBetween(
    Math.max(1, Math.min(total, startLine)),
    Math.max(1, Math.min(total, endLine)),
  );
}

type CmFence = {
  openLine: number;
  closeLine: number;
  openFrom: number;
  openTo: number;
  info: string;
};

/** 找包含 pos 的围栏（含开闭行） */
export function findCmFenceAt(view: CmView, pos: number): CmFence | null {
  const doc = view.state.doc;
  let openLine = -1;
  let openFrom = -1;
  let openTo = -1;
  let info = "";
  let marker = "";

  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n);
    const m = /^(```|~~~)(.*)$/.exec(line.text);
    if (!m) continue;
    if (openLine < 0) {
      openLine = n;
      openFrom = line.from;
      openTo = line.to;
      marker = m[1] ?? "```";
      info = (m[2] ?? "").trim();
      continue;
    }
    const closeOk =
      line.text.startsWith(marker) && /^(```|~~~)\s*$/.test(line.text);
    if (!closeOk) continue;
    if (pos >= openFrom && pos <= line.to) {
      return { openLine, closeLine: n, openFrom, openTo, info };
    }
    openLine = -1;
    openFrom = -1;
    openTo = -1;
    info = "";
    marker = "";
  }
  return null;
}

export function inspectCmCodeBlockHighlight(
  view: CmView,
): CodeBlockHighlightState | null {
  const { from, to } = view.state.selection.main;
  const fence = findCmFenceAt(view, from);
  if (!fence) return null;
  // 选区终点也须在同一围栏
  if (to !== from) {
    const other = findCmFenceAt(view, Math.max(from, to - 1));
    if (!other || other.openFrom !== fence.openFrom) return null;
  }

  const parsed = parseFenceInfo(fence.info);
  const highlightable = isHighlightableCodeLang(fence.info);
  const bodyFirst = fence.openLine + 1;
  const bodyLast = fence.closeLine - 1;
  if (bodyLast < bodyFirst) {
    return {
      highlightable,
      language: parsed.lang,
      highlightLines: parsed.highlightLines,
      selectedLines: [],
    };
  }

  const doc = view.state.doc;
  const fromLine = doc.lineAt(from).number;
  const toLine = doc.lineAt(to > from ? to - 1 : to).number;
  const start = Math.max(bodyFirst, Math.min(fromLine, toLine));
  const end = Math.min(bodyLast, Math.max(fromLine, toLine));
  const selectedLines =
    start <= end
      ? linesBetween(start, end).map((n) => n - bodyFirst + 1)
      : [];

  return {
    highlightable,
    language: parsed.lang,
    highlightLines: parsed.highlightLines,
    selectedLines,
  };
}

export function applyCmCodeBlockHighlight(
  view: CmView,
  lines: readonly number[] | null,
): boolean {
  const { from } = view.state.selection.main;
  const fence = findCmFenceAt(view, from);
  if (!fence || !isHighlightableCodeLang(fence.info)) return false;
  const { lang } = parseFenceInfo(fence.info);
  const nextInfo = formatFenceInfo(lang, lines ?? []);
  const openLine = view.state.doc.lineAt(fence.openFrom);
  const marker = /^(```|~~~)/.exec(openLine.text)?.[1] ?? "```";
  const insert = nextInfo ? `${marker}${nextInfo}` : marker;
  view.dispatch({
    changes: { from: openLine.from, to: openLine.to, insert },
    scrollIntoView: true,
  });
  view.focus();
  return true;
}

export function inspectPmCodeBlockHighlight(
  view: PmView,
): CodeBlockHighlightState | null {
  const { state } = view;
  const { from, to, $from } = state.selection;
  let depth = $from.depth;
  while (depth > 0 && $from.node(depth).type.name !== "code_block") {
    depth -= 1;
  }
  const node =
    depth > 0
      ? $from.node(depth)
      : $from.parent.type.name === "code_block"
        ? $from.parent
        : null;
  if (!node || node.type.name !== "code_block") return null;

  const nodeDepth =
    depth > 0 ? depth : $from.parent.type.name === "code_block" ? $from.depth : 0;
  const contentStart = $from.start(nodeDepth);
  const rawLang = String(node.attrs.language ?? "");
  const parsed = parseFenceInfo(rawLang);
  const text = node.textContent;
  const selectedLines = selectedLinesInText(
    text,
    from - contentStart,
    to - contentStart,
  );

  return {
    highlightable: isHighlightableCodeLang(rawLang),
    language: parsed.lang,
    highlightLines: parsed.highlightLines,
    selectedLines,
  };
}

export function applyPmCodeBlockHighlight(
  view: PmView,
  lines: readonly number[] | null,
): boolean {
  const { state, dispatch } = view;
  const { $from } = state.selection;
  let depth = $from.depth;
  while (depth > 0 && $from.node(depth).type.name !== "code_block") {
    depth -= 1;
  }
  if (depth === 0 && $from.parent.type.name !== "code_block") return false;
  const nodeDepth = depth > 0 ? depth : $from.depth;
  const node = $from.node(nodeDepth);
  const pos = $from.before(nodeDepth);
  const rawLang = String(node.attrs.language ?? "");
  if (!isHighlightableCodeLang(rawLang)) return false;
  const { lang } = parseFenceInfo(rawLang);
  const next = formatFenceInfo(lang, lines ?? []);
  dispatch(
    state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      language: next,
    }),
  );
  view.focus();
  return true;
}
