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
    /** 输入时防抖刷新下方渲染（不删节点） */
    onLiveUpdate?: () => void;
    /** Enter 提交（图片/行内公式）；块级源码用 Ctrl/Cmd+Enter */
    enterCommits?: boolean;
    liveUpdateMs?: number;
  },
) {
  const {
    view,
    pos,
    onPin,
    onCommit,
    onReset,
    onLiveUpdate,
    enterCommits = true,
    liveUpdateMs = 120,
  } = opts;
  /** Enter 会 blur，避免 onCommit 执行两次（清空删除时尤其危险） */
  let commitOnce = false;
  let liveTimer: ReturnType<typeof setTimeout> | null = null;

  const clearLiveTimer = () => {
    if (liveTimer != null) {
      clearTimeout(liveTimer);
      liveTimer = null;
    }
  };

  const scheduleLiveUpdate = () => {
    if (!onLiveUpdate) return;
    clearLiveTimer();
    liveTimer = setTimeout(() => {
      liveTimer = null;
      if (document.activeElement !== input || view.isDestroyed) return;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      onLiveUpdate();
      // dispatch 后 ProseMirror 可能抢焦点，源码条编辑中需收回
      if (document.activeElement !== input && !view.isDestroyed) {
        input.focus({ preventScroll: true });
        try {
          input.setSelectionRange(start, end);
        } catch {
          /* ignore */
        }
      }
    }, liveUpdateMs);
  };

  const runCommit = () => {
    if (commitOnce) return;
    commitOnce = true;
    clearLiveTimer();
    try {
      onCommit();
    } finally {
      queueMicrotask(() => {
        commitOnce = false;
      });
    }
  };

  input.addEventListener("focus", () => onPin(pos));
  input.addEventListener("input", () => {
    autosizeTextarea(input);
    scheduleLiveUpdate();
  });
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      clearLiveTimer();
      onReset();
      input.blur();
      return;
    }
    if (e.key === "Enter") {
      const mod = e.ctrlKey || e.metaKey;
      if (enterCommits && !e.shiftKey) {
        e.preventDefault();
        runCommit();
        input.blur();
      } else if (!enterCommits && mod) {
        e.preventDefault();
        runCommit();
        input.blur();
      }
    }
  });
  input.addEventListener("mousedown", (e) => e.stopPropagation());
  input.addEventListener("pointerdown", (e) => e.stopPropagation());
  input.addEventListener("blur", () => {
    runCommit();
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
