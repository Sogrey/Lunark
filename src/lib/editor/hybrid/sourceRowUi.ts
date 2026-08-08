import type { EditorView } from "@milkdown/kit/prose/view";
import { hybridSourceMarksKey } from "./pluginKey";

export type SourceCache = {
  pos: number;
  kind: string;
  fingerprint: string;
  el: HTMLElement;
  input: HTMLTextAreaElement;
};

export function createMarkChip(text: string): HTMLElement {
  const el = document.createElement("span");
  el.className = "lunark-md-delim";
  el.textContent = text;
  el.contentEditable = "false";
  el.setAttribute("aria-hidden", "true");
  return el;
}

export function autosizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.max(el.scrollHeight, 22)}px`;
}

export function bindSourceTextarea(
  input: HTMLTextAreaElement,
  opts: {
    view: EditorView;
    pos: number;
    onPin: (pos: number | null) => void;
    onCommit: () => void;
    onReset: () => void;
    /** Enter 提交（图片/行内公式）；块级源码用 Ctrl/Cmd+Enter */
    enterCommits?: boolean;
  },
) {
  const { view, pos, onPin, onCommit, onReset, enterCommits = true } = opts;
  input.addEventListener("focus", () => onPin(pos));
  input.addEventListener("input", () => autosizeTextarea(input));
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      onReset();
      input.blur();
      return;
    }
    if (e.key === "Enter") {
      const mod = e.ctrlKey || e.metaKey;
      if (enterCommits && !e.shiftKey) {
        e.preventDefault();
        onCommit();
        input.blur();
      } else if (!enterCommits && mod) {
        e.preventDefault();
        onCommit();
        input.blur();
      }
    }
  });
  input.addEventListener("mousedown", (e) => e.stopPropagation());
  input.addEventListener("pointerdown", (e) => e.stopPropagation());
  input.addEventListener("blur", () => {
    onCommit();
    onPin(null);
    queueMicrotask(() => {
      if (!view.isDestroyed) {
        view.dispatch(
          view.state.tr.setMeta(hybridSourceMarksKey, "unpin-source"),
        );
      }
    });
  });
  requestAnimationFrame(() => autosizeTextarea(input));
}
