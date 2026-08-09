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

let imageCache: SourceCache | null = null;
let pinnedImagePos: number | null = null;

function basenameHint(src: string): string {
  const clean = src.split(/[?#]/)[0] ?? src;
  const part = clean.split(/[/\\]/).pop() ?? "";
  return part.replace(/\.[^.]+$/, "") || part || "image";
}

function formatImageMarkdown(node: PmNode): string {
  const src = String(node.attrs.src ?? "");
  if (node.type.name === "image-block") {
    const caption = String(node.attrs.caption ?? "").trim();
    const alt = caption || basenameHint(src);
    return `![${alt}](${src})`;
  }
  const alt = String(node.attrs.alt ?? "");
  const title = node.attrs.title ? String(node.attrs.title) : "";
  if (title) return `![${alt}](${src} "${title}")`;
  return `![${alt}](${src})`;
}

function parseImageMarkdown(
  text: string,
): { alt: string; src: string; title: string } | null {
  const trimmed = text.trim();
  const m = trimmed.match(
    /^!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+"([^"]*)")?\s*\)$/,
  );
  if (!m) return null;
  return {
    alt: m[1] ?? "",
    src: m[2] ?? "",
    title: m[3] ?? "",
  };
}

/** 删除图片 / image-block 节点，光标落在原位置 */
export function deleteImageAt(view: EditorView, pos: number) {
  deleteNodeAt(
    view,
    pos,
    (n) => n.type.name === "image-block" || n.type.name === "image",
    () => clearImageSourceCache(),
  );
}

function imageFingerprint(node: PmNode): string {
  return `${node.type.name}|${node.attrs.src}|${
    node.attrs.caption ?? node.attrs.alt ?? ""
  }|${node.attrs.title ?? ""}`;
}

function commitImageSource(view: EditorView, pos: number, text: string) {
  // 源码清空后回车 / 失焦 → 与删除按钮相同
  if (!text.trim()) {
    deleteImageAt(view, pos);
    return;
  }
  applyImageMarkdown(view, pos, text);
}

/** 可解析时更新节点；半成品 / 非法语法跳过（实时预览不删节点） */
function applyImageMarkdown(view: EditorView, pos: number, text: string) {
  const parsed = parseImageMarkdown(text);
  if (!parsed || !parsed.src) return;
  const node = view.state.doc.nodeAt(pos);
  if (!node) return;

  if (node.type.name === "image-block") {
    const next = {
      ...node.attrs,
      src: parsed.src,
      caption: parsed.title || parsed.alt,
    };
    if (next.src === node.attrs.src && next.caption === node.attrs.caption) {
      return;
    }
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, next));
    syncImageCacheAfterDispatch(view, pos);
    return;
  }

  if (node.type.name === "image") {
    const next = {
      ...node.attrs,
      src: parsed.src,
      alt: parsed.alt,
      title: parsed.title || null,
    };
    if (
      next.src === node.attrs.src &&
      next.alt === node.attrs.alt &&
      (next.title ?? null) === (node.attrs.title ?? null)
    ) {
      return;
    }
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, next));
    syncImageCacheAfterDispatch(view, pos);
  }
}

/** dispatch 后对齐 cache.pos / fingerprint / pin（与 previewBlock 一致） */
function syncImageCacheAfterDispatch(view: EditorView, pos: number) {
  if (!imageCache) return;
  const latest = view.state.doc.nodeAt(pos);
  if (!latest) return;
  imageCache.pos = pos;
  imageCache.fingerprint = imageFingerprint(latest);
  if (pinnedImagePos != null) pinnedImagePos = pos;
}

export function selectedImage(
  state: EditorState,
): { pos: number; node: PmNode } | null {
  const { selection } = state;
  if (selection instanceof NodeSelection) {
    const { node, from } = selection;
    if (node.type.name === "image-block" || node.type.name === "image") {
      return { pos: from, node };
    }
  }
  if (pinnedImagePos != null) {
    const node = state.doc.nodeAt(pinnedImagePos);
    if (
      node &&
      (node.type.name === "image-block" || node.type.name === "image")
    ) {
      return { pos: pinnedImagePos, node };
    }
  }
  return null;
}

export function getOrCreateImageSourceRow(
  view: EditorView,
  pos: number,
  node: PmNode,
): HTMLElement {
  const fingerprint = imageFingerprint(node);

  if (
    imageCache &&
    imageCache.pos === pos &&
    imageCache.kind === node.type.name
  ) {
    if (
      document.activeElement !== imageCache.input &&
      imageCache.fingerprint !== fingerprint
    ) {
      imageCache.input.value = formatImageMarkdown(node);
      imageCache.fingerprint = fingerprint;
      autosizeTextarea(imageCache.input);
    } else if (document.activeElement === imageCache.input) {
      imageCache.fingerprint = fingerprint;
    }
    return imageCache.el;
  }

  const row = document.createElement("div");
  row.className = "lunark-md-image-source";
  row.contentEditable = "false";

  const icon = document.createElement("span");
  icon.className = "lunark-md-image-source-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/></svg>';

  const input = document.createElement("textarea");
  input.className = "lunark-md-image-source-input";
  input.rows = 1;
  input.spellcheck = false;
  input.value = formatImageMarkdown(node);
  input.setAttribute("aria-label", t("editor.ariaImageSource"));

  bindSourceTextarea(input, {
    view,
    pos,
    onPin: (p) => {
      pinnedImagePos = p;
    },
    onCommit: () =>
      commitImageSource(view, pinnedImagePos ?? pos, input.value),
    onLiveUpdate: () =>
      applyImageMarkdown(view, pinnedImagePos ?? pos, input.value),
    onReset: () => {
      const latest = view.state.doc.nodeAt(pinnedImagePos ?? pos) ?? node;
      input.value = formatImageMarkdown(latest);
      autosizeTextarea(input);
    },
    enterCommits: true,
  });

  row.append(
    icon,
    input,
    createTrashDeleteButton(() => deleteImageAt(view, pos)),
  );
  imageCache = {
    pos,
    kind: node.type.name,
    fingerprint,
    el: row,
    input,
  };
  return row;
}

export function clearImageSourceCache() {
  imageCache = null;
  pinnedImagePos = null;
}
