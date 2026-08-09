import type { Node as PmNode } from "@milkdown/kit/prose/model";
import { NodeSelection, type EditorState } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { t } from "@/lib/i18n";
import { createTrashDeleteButton, deleteNodeAt } from "./blockDeleteUi";
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

function isLatexLang(lang: string): boolean {
  return (
    lang === "latex" || lang === "tex" || lang === "math" || lang === "katex"
  );
}

function formatPreviewBlockMarkdown(node: PmNode): string {
  const lang = String(node.attrs.language ?? "").toLowerCase();
  const content = node.textContent;
  // 空内容不再包一层 $$，避免残留 $$$$
  if (!content.trim()) return "";
  if (isLatexLang(lang)) {
    if (content.includes("\n")) return `$$\n${content}\n$$`;
    return `$$${content}$$`;
  }
  const fenceLang = lang || "mermaid";
  return `\`\`\`${fenceLang}\n${content}\n\`\`\``;
}

/** 源码清空或只剩空 $$ / 空围栏 → 整块删除（修 $$$$ 残留） */
export function isVacantPreviewMarkdown(text: string): boolean {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return true;
  if (/^\$\$+\s*\$\$$/.test(trimmed)) return true;
  if (/^\$\$\s*$/.test(trimmed)) return true;

  const fence = trimmed.match(/^```\w*\n([\s\S]*?)\n```$/);
  if (fence && !(fence[1] ?? "").trim()) return true;

  const dollarBlock = trimmed.match(/^\$\$\n([\s\S]*?)\n\$\$$/);
  if (dollarBlock && !(dollarBlock[1] ?? "").trim()) return true;

  const dollarInline = trimmed.match(/^\$\$([\s\S]*?)\$\$$/);
  if (dollarInline && !(dollarInline[1] ?? "").trim()) return true;

  return false;
}

function parsePreviewMarkdown(
  text: string,
  fallbackLang: string,
): { lang: string; content: string } {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  let lang = fallbackLang;
  let content = trimmed;

  const fence = trimmed.match(/^```(\w*)\n([\s\S]*?)\n```$/);
  const dollarBlock = trimmed.match(/^\$\$\n([\s\S]*?)\n\$\$$/);
  const dollarInline = trimmed.match(/^\$\$([\s\S]*?)\$\$$/);

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

  return { lang, content };
}

export function deletePreviewBlockAt(view: EditorView, pos: number) {
  deleteNodeAt(view, pos, isPreviewFirstCodeBlock, () =>
    clearPreviewBlockSourceCache(),
  );
}

function commitPreviewBlockMarkdown(
  view: EditorView,
  pos: number,
  text: string,
) {
  if (isVacantPreviewMarkdown(text)) {
    deletePreviewBlockAt(view, pos);
    return;
  }
  applyPreviewBlockMarkdown(view, pos, text, { deleteIfEmpty: true });
}

/** 更新代码块正文；实时预览时 deleteIfEmpty=false，避免半成品误删 */
function applyPreviewBlockMarkdown(
  view: EditorView,
  pos: number,
  text: string,
  opts: { deleteIfEmpty?: boolean } = {},
) {
  const { deleteIfEmpty = true } = opts;
  const node = view.state.doc.nodeAt(pos);
  if (!node || !isPreviewFirstCodeBlock(node)) return;

  const fallbackLang = String(node.attrs.language ?? "mermaid");
  const { lang, content } = parsePreviewMarkdown(text, fallbackLang);

  // 解析后正文为空 → 提交时删整块；实时刷新仅跳过
  if (!content.trim()) {
    if (deleteIfEmpty) deletePreviewBlockAt(view, pos);
    return;
  }

  if (node.textContent === content && String(node.attrs.language ?? "") === lang) {
    return;
  }

  const from = pos + 1;
  const to = pos + node.nodeSize - 1;
  let tr = view.state.tr.replaceWith(from, to, view.state.schema.text(content));
  const mappedPos = tr.mapping.map(pos);
  const current = tr.doc.nodeAt(mappedPos);
  if (current && String(current.attrs.language ?? "") !== lang) {
    tr = tr.setNodeMarkup(mappedPos, undefined, {
      ...current.attrs,
      language: lang,
    });
  }
  if (!tr.docChanged) return;
  view.dispatch(tr);
  if (
    previewBlockCache &&
    (previewBlockCache.pos === pos || previewBlockCache.pos === mappedPos)
  ) {
    const latest = view.state.doc.nodeAt(mappedPos);
    if (latest) {
      previewBlockCache.pos = mappedPos;
      previewBlockCache.fingerprint = `${String(latest.attrs.language ?? "").toLowerCase()}\n${latest.textContent}`;
    }
  }
}

function liveApplyPreviewBlockMarkdown(
  view: EditorView,
  pos: number,
  text: string,
) {
  if (isVacantPreviewMarkdown(text)) return;
  applyPreviewBlockMarkdown(view, pos, text, { deleteIfEmpty: false });
}

function previewLabel(lang: string): string {
  if (lang === "mermaid") return "mermaid";
  if (isLatexLang(lang)) return "latex";
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
    } else if (document.activeElement === previewBlockCache.input) {
      previewBlockCache.fingerprint = fingerprint;
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
    onCommit: () =>
      commitPreviewBlockMarkdown(
        view,
        pinnedPreviewBlockPos ?? pos,
        input.value,
      ),
    onLiveUpdate: () =>
      liveApplyPreviewBlockMarkdown(
        view,
        pinnedPreviewBlockPos ?? pos,
        input.value,
      ),
    onReset: () => {
      const latest =
        view.state.doc.nodeAt(pinnedPreviewBlockPos ?? pos) ?? node;
      input.value = formatPreviewBlockMarkdown(latest);
      autosizeTextarea(input);
    },
    enterCommits: false,
    liveUpdateMs: 160,
  });

  row.append(
    label,
    input,
    createTrashDeleteButton(() => deletePreviewBlockAt(view, pos)),
  );
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
