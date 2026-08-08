import type { Node as PmNode } from "@milkdown/kit/prose/model";
import { NodeSelection, type EditorState } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { t } from "@/lib/i18n";
import {
  autosizeTextarea,
  bindSourceTextarea,
  type SourceCache,
} from "./sourceRowUi";

let mathCache: SourceCache | null = null;
let pinnedMathPos: number | null = null;

function formatInlineMathMarkdown(node: PmNode): string {
  return `$${String(node.attrs.value ?? "")}$`;
}

function parseInlineMathMarkdown(text: string): string | null {
  const trimmed = text.trim();
  const m = trimmed.match(/^\$([\s\S]+?)\$$/);
  if (m) return m[1] ?? "";
  if (trimmed.length > 0) return trimmed;
  return null;
}

function applyInlineMathMarkdown(view: EditorView, pos: number, text: string) {
  const value = parseInlineMathMarkdown(text);
  if (value == null) return;
  const node = view.state.doc.nodeAt(pos);
  if (!node || node.type.name !== "math_inline") return;
  if (String(node.attrs.value ?? "") === value) return;
  view.dispatch(
    view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, value }),
  );
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
    onCommit: () => applyInlineMathMarkdown(view, pos, input.value),
    onReset: () => {
      const latest = view.state.doc.nodeAt(pos) ?? node;
      input.value = formatInlineMathMarkdown(latest);
      autosizeTextarea(input);
    },
    enterCommits: true,
  });

  row.append(input);
  mathCache = { pos, kind: "math_inline", fingerprint, el: row, input };
  return row;
}

export function clearMathSourceCache() {
  mathCache = null;
  pinnedMathPos = null;
}
