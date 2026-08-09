import type { Node as PmNode } from "@milkdown/kit/prose/model";
import { NodeSelection, type EditorState } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { t } from "@/lib/i18n";
import { createTrashDeleteButton, deleteNodeAt } from "./blockDeleteUi";
import {
  autosizeTextarea,
  bindSourceTextarea,
  type SourceCache,
} from "./sourceRowUi";

let mathCache: SourceCache | null = null;
let pinnedMathPos: number | null = null;

function formatInlineMathMarkdown(node: PmNode): string {
  const value = String(node.attrs.value ?? "");
  if (!value.trim()) return "";
  return `$${value}$`;
}

function parseInlineMathMarkdown(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed === "$" || /^\$\s*\$$/.test(trimmed)) return null;
  const m = trimmed.match(/^\$([\s\S]*?)\$$/);
  if (m) {
    const inner = (m[1] ?? "").trim();
    return inner.length ? inner : null;
  }
  if (trimmed.length > 0) return trimmed;
  return null;
}

export function deleteInlineMathAt(view: EditorView, pos: number) {
  deleteNodeAt(
    view,
    pos,
    (n) => n.type.name === "math_inline",
    () => clearMathSourceCache(),
  );
}

/** 可解析时更新节点；空/半成品跳过（实时预览不删节点） */
function applyInlineMathMarkdown(
  view: EditorView,
  pos: number,
  text: string,
) {
  const value = parseInlineMathMarkdown(text);
  if (value == null) return;
  const node = view.state.doc.nodeAt(pos);
  if (!node || node.type.name !== "math_inline") return;
  if (String(node.attrs.value ?? "") === value) return;
  view.dispatch(
    view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, value }),
  );
  if (mathCache) {
    const latest = view.state.doc.nodeAt(pos);
    mathCache.pos = pos;
    mathCache.fingerprint = String(latest?.attrs.value ?? value);
    if (pinnedMathPos != null) pinnedMathPos = pos;
  }
}

function commitInlineMathMarkdown(
  view: EditorView,
  pos: number,
  text: string,
) {
  const value = parseInlineMathMarkdown(text);
  if (value == null) {
    deleteInlineMathAt(view, pos);
    return;
  }
  applyInlineMathMarkdown(view, pos, text);
}

export function selectedInlineMath(
  state: EditorState,
): { pos: number; node: PmNode } | null {
  const { selection } = state;
  if (selection instanceof NodeSelection) {
    const { node, from } = selection;
    if (node.type.name === "math_inline") {
      return { pos: from, node };
    }
  }
  if (pinnedMathPos != null) {
    const node = state.doc.nodeAt(pinnedMathPos);
    if (node?.type.name === "math_inline") {
      return { pos: pinnedMathPos, node };
    }
  }
  return null;
}

export function getOrCreateMathSourceRow(
  view: EditorView,
  pos: number,
  node: PmNode,
): HTMLElement {
  const fingerprint = String(node.attrs.value ?? "");
  if (mathCache && mathCache.pos === pos) {
    if (
      document.activeElement !== mathCache.input &&
      mathCache.fingerprint !== fingerprint
    ) {
      mathCache.input.value = formatInlineMathMarkdown(node);
      mathCache.fingerprint = fingerprint;
      autosizeTextarea(mathCache.input);
    } else if (document.activeElement === mathCache.input) {
      mathCache.fingerprint = fingerprint;
    }
    return mathCache.el;
  }

  const row = document.createElement("div");
  row.className = "lunark-md-math-source";
  row.contentEditable = "false";

  const input = document.createElement("textarea");
  input.className = "lunark-md-math-source-input";
  input.rows = 1;
  input.spellcheck = false;
  input.value = formatInlineMathMarkdown(node);
  input.setAttribute("aria-label", t("editor.ariaMathSource"));

  bindSourceTextarea(input, {
    view,
    pos,
    onPin: (p) => {
      pinnedMathPos = p;
    },
    onCommit: () =>
      commitInlineMathMarkdown(view, pinnedMathPos ?? pos, input.value),
    onLiveUpdate: () =>
      applyInlineMathMarkdown(view, pinnedMathPos ?? pos, input.value),
    onReset: () => {
      const latest = view.state.doc.nodeAt(pinnedMathPos ?? pos) ?? node;
      input.value = formatInlineMathMarkdown(latest);
      autosizeTextarea(input);
    },
    enterCommits: true,
  });

  row.append(
    input,
    createTrashDeleteButton(() => deleteInlineMathAt(view, pos)),
  );
  mathCache = { pos, kind: "math_inline", fingerprint, el: row, input };
  return row;
}

export function clearMathSourceCache() {
  mathCache = null;
  pinnedMathPos = null;
}
