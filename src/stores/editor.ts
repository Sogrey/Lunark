import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";
import { EditorView } from "@codemirror/view";
import { useTabsStore } from "@/stores/tabs";

export type ViewMode = "split" | "source";

/** 编辑器视图状态；文档内容以 tabs.activeTab 为准 */
export const useEditorStore = defineStore("editor", () => {
  const tabs = useTabsStore();
  const viewMode = ref<ViewMode>("split");
  const splitRatio = ref(0.5);
  const cmView = shallowRef<EditorView | null>(null);
  const previewEl = shallowRef<HTMLElement | null>(null);
  const scrollSyncEnabled = ref(true);

  const content = computed(() => tabs.activeTab.content);
  const dirty = computed(() => tabs.activeTab.dirty);
  const filePath = computed(() => tabs.activeTab.path);
  const fileName = computed(() => tabs.activeTab.name);
  const title = computed(() =>
    dirty.value ? `${fileName.value} •` : fileName.value,
  );

  function setContent(value: string, markDirty = true) {
    tabs.setActiveContent(value, markDirty);
  }

  function markSaved() {
    tabs.markActiveSaved();
  }

  function toggleViewMode() {
    viewMode.value = viewMode.value === "split" ? "source" : "split";
  }

  function setSplitRatio(ratio: number) {
    splitRatio.value = Math.min(0.8, Math.max(0.2, ratio));
  }

  function openDocument(path: string | null, name: string, text: string) {
    tabs.openOrFocus(path, name, text);
  }

  function setCmView(view: EditorView | null) {
    cmView.value = view;
  }

  function setPreviewEl(el: HTMLElement | null) {
    previewEl.value = el;
  }

  function setScrollSyncEnabled(enabled: boolean) {
    scrollSyncEnabled.value = enabled;
  }

  /** 跳转到源码行（1-based）并滚动预览标题 */
  function jumpToHeading(line: number, headingId: string) {
    const view = cmView.value;
    if (view) {
      const safeLine = Math.min(Math.max(line, 1), view.state.doc.lines);
      const lineInfo = view.state.doc.line(safeLine);
      view.dispatch({
        selection: { anchor: lineInfo.from },
        effects: EditorView.scrollIntoView(lineInfo.from, { y: "center" }),
      });
      view.focus();
    }

    requestAnimationFrame(() => {
      const el = document.getElementById(headingId);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return {
    content,
    dirty,
    viewMode,
    filePath,
    fileName,
    title,
    splitRatio,
    cmView,
    previewEl,
    scrollSyncEnabled,
    setContent,
    markSaved,
    toggleViewMode,
    setSplitRatio,
    openDocument,
    setCmView,
    setPreviewEl,
    setScrollSyncEnabled,
    jumpToHeading,
  };
});
