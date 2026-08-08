import type { Node as PmNode } from "@milkdown/kit/prose/model";
import { NodeSelection, type EditorState } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { t } from "@/lib/i18n";
import { PREVIEW_FIRST_LANGS } from "./constants";
import {
  autosizeTextarea,
  bindSourceTextarea,
  type SourceCache,
} from "./sourceRowUi";

let previewBlockCache: SourceCache | null = null;
let pinnedPreviewBlockPos: number | null = null;

export function isPreviewFirstCodeBlock(node: PmNode): boolean {
  if (node.type.name !== "code_block") return false;
  const lang = String(node.attrs.language ?? "").toLowerCase();
  return PREVIEW_FIRST_LANGS.has(lang);
}

export function selectedPreviewBlock(
  state: EditorState,
): { pos: number; node: PmNode } | null {
  const { selection } = state;
  if (selection instanceof NodeSelection) {
    const { node, from } = selection;
    if (isPreviewFirstCodeBlock(node)) return { pos: from, node };
  }

  const $from = selection.$from;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (isPreviewFirstCodeBlock(node)) {
      return { pos: $from.before(d), node };
    }
  }

  if (pinnedPreviewBlockPos != null) {
    const node = state.doc.nodeAt(pinnedPreviewBlockPos);
    if (node && isPreviewFirstCodeBlock(node)) {
      return { pos: pinnedPreviewBlockPos, node };
    }
  }
  return null;
}

function formatPreviewBlockMarkdown(node: PmNode): string {
  const lang = String(node.attrs.language ?? "").toLowerCase();
  const content = node.textContent;
  if (
    lang === "latex" ||
    lang === "tex" ||
    lang === "math" ||
    lang === "katex"
  ) {
    if (content.includes("\n")) return `$$\n${content}\n$$`;
    return `$$${content}$$`;
  }
  const fenceLang = lang || "mermaid";
  return `\`\`\`${fenceLang}\n${content}\n\`\`\``;
}

function applyPreviewBlockMarkdown(
  view: EditorView,
  pos: number,
  text: string,
) {
  const node = view.state.doc.nodeAt(pos);
  if (!node || !isPreviewFirstCodeBlock(node)) return;

  const trimmed = text.replace(/\r\n/g, "\n").trim();
  let lang = String(node.attrs.language ?? "mermaid");
  let content = trimmed;

  const fence = trimmed.match(/^```(\w*)\n([\s\S]*?)\n```$/);
  const dollarBlock = trimmed.match(/^\$\$\n([\s\S]*?)\n\$\$$/);
  const dollarInline = trimmed.match(/^\$\$([\s\S]+?)\$\$$/);

  if (fence) {
    lang = fence[1] || lang;
    content = fence[2] ?? "";
  } else if (dollarBlock) {
    lang = "latex";
    content = dollarBlock[1] ?? "";
  } else if (dollarInline) {
    lang = "latex";
    content = dollarInline[1] ?? "";
  }

  const from = pos + 1;
  const to = pos + node.nodeSize - 1;
  let tr = view.state.tr;
  if (content) {
    tr = tr.replaceWith(from, to, view.state.schema.text(content));
  } else {
    tr = tr.delete(from, to);
  }
  const mappedPos = tr.mapping.map(pos);
  const current = tr.doc.nodeAt(mappedPos);
  if (current && String(current.attrs.language ?? "") !== lang) {
    tr = tr.setNodeMarkup(mappedPos, undefined, {
      ...current.attrs,
      language: lang,
    });
  }
  if (tr.docChanged) view.dispatch(tr);
}

function previewLabel(lang: string): string {
  if (lang === "mermaid") return "mermaid";
  if (
    lang === "latex" ||
    lang === "tex" ||
    lang === "math" ||
    lang === "katex"
  ) {
    return "latex";
  }
  return lang;
}

export function getOrCreatePreviewBlockSourceRow(
  view: EditorView,
  pos: number,
  node: PmNode,
): HTMLElement {
  const lang = String(node.attrs.language ?? "").toLowerCase();
  const fingerprint = `${lang}\n${node.textContent}`;

  if (previewBlockCache && previewBlockCache.pos === pos) {
    if (
      document.activeElement !== previewBlockCache.input &&
      previewBlockCache.fingerprint !== fingerprint
    ) {
      previewBlockCache.input.value = formatPreviewBlockMarkdown(node);
      previewBlockCache.fingerprint = fingerprint;
      autosizeTextarea(previewBlockCache.input);
    }
    return previewBlockCache.el;
  }

  const row = document.createElement("div");
  row.className = "lunark-md-preview-source";
  row.contentEditable = "false";
  row.dataset.lang = lang;

  const label = document.createElement("span");
  label.className = "lunark-md-preview-source-label";
  label.textContent = previewLabel(lang);

  const input = document.createElement("textarea");
  input.className = "lunark-md-preview-source-input";
  input.rows = 3;
  input.spellcheck = false;
  input.value = formatPreviewBlockMarkdown(node);
  input.setAttribute("aria-label", t("editor.ariaBlockSource"));

  bindSourceTextarea(input, {
    view,
    pos,
    onPin: (p) => {
      pinnedPreviewBlockPos = p;
    },
    onCommit: () => applyPreviewBlockMarkdown(view, pos, input.value),
    onReset: () => {
      const latest = view.state.doc.nodeAt(pos) ?? node;
      input.value = formatPreviewBlockMarkdown(latest);
      autosizeTextarea(input);
    },
    enterCommits: false,
  });

  row.append(label, input);
  previewBlockCache = {
    pos,
    kind: lang,
    fingerprint,
    el: row,
    input,
  };
  return row;
}

/** 始终隐藏 Crepe CM，改用上方源码条（与图片一致） */
export function syncPreviewFirstDom(view: EditorView) {
  view.dom
    .querySelectorAll<HTMLElement>(".milkdown-code-block.lunark-preview-first")
    .forEach((el) => {
      el.classList.remove("lunark-preview-first");
      el.removeAttribute("data-lunark-preview-lang");
    });

  view.state.doc.descendants((node, pos) => {
    if (!isPreviewFirstCodeBlock(node)) return true;
    const lang = String(node.attrs.language ?? "").toLowerCase();
    const dom = view.nodeDOM(pos);
    if (dom instanceof HTMLElement) {
      dom.classList.add("lunark-preview-first");
      dom.setAttribute("data-lunark-preview-lang", lang);
    }
    return true;
  });
}

export function clearPreviewBlockSourceCache() {
  previewBlockCache = null;
  pinnedPreviewBlockPos = null;
}
