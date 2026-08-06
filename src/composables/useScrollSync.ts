import { onBeforeUnmount, watch, type WatchStopHandle } from "vue";
import { useEditorStore } from "@/stores/editor";

function scrollRatio(el: HTMLElement): number {
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 0) return 0;
  return el.scrollTop / max;
}

function applyRatio(el: HTMLElement, ratio: number) {
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 0) return;
  el.scrollTop = ratio * max;
}

/**
 * 源码区（CM6 scroller）与预览区滚动比例联动。
 */
export function useScrollSync() {
  const editor = useEditorStore();
  let syncing = false;
  let editorScroller: HTMLElement | null = null;
  let stopWatch: WatchStopHandle | null = null;

  function withLock(fn: () => void) {
    if (syncing || !editor.scrollSyncEnabled) return;
    syncing = true;
    try {
      fn();
    } finally {
      requestAnimationFrame(() => {
        syncing = false;
      });
    }
  }

  function onEditorScroll() {
    const preview = editor.previewEl;
    if (!editorScroller || !preview) return;
    withLock(() => {
      applyRatio(preview, scrollRatio(editorScroller!));
    });
  }

  function onPreviewScroll() {
    const preview = editor.previewEl;
    if (!editorScroller || !preview) return;
    withLock(() => {
      applyRatio(editorScroller!, scrollRatio(preview));
    });
  }

  function detach() {
    editorScroller?.removeEventListener("scroll", onEditorScroll);
    editor.previewEl?.removeEventListener("scroll", onPreviewScroll);
    editorScroller = null;
  }

  function attach() {
    detach();
    const view = editor.cmView;
    const preview = editor.previewEl;
    if (!view || !preview || editor.viewMode !== "split") return;

    editorScroller = view.scrollDOM;
    editorScroller.addEventListener("scroll", onEditorScroll, { passive: true });
    preview.addEventListener("scroll", onPreviewScroll, { passive: true });
  }

  stopWatch = watch(
    () => [editor.cmView, editor.previewEl, editor.viewMode] as const,
    () => {
      // DOM 就绪后再绑
      requestAnimationFrame(attach);
    },
    { immediate: true, flush: "post" },
  );

  onBeforeUnmount(() => {
    stopWatch?.();
    detach();
  });

  return { attach, detach };
}
