import { defineStore } from "pinia";
import { computed, nextTick, ref, shallowRef } from "vue";
import { EditorView } from "@codemirror/view";
import { useTabsStore } from "@/stores/tabs";
import { insertTextAtCursor } from "@/lib/editor/insertText";
import { t, trackLocale } from "@/lib/i18n";
import { DEFAULT_PICGO_ENDPOINT } from "@/lib/fs/picgo";
import {
  createDefaultImageHosts,
  resolveActiveHost,
  type ImageHostProfile,
} from "@/lib/fs/imageHosts";

export type ViewMode = "hybrid" | "split" | "source";

const VIEW_CYCLE: ViewMode[] = ["hybrid", "source", "split"];

/** 等 CM 挂载就绪（hybrid→source 切换可能超过一帧） */
async function waitForCmView(
  getView: () => EditorView | null,
  attempts = 24,
): Promise<EditorView | null> {
  for (let i = 0; i < attempts; i++) {
    const view = getView();
    if (view) return view;
    await nextTick();
    await new Promise<void>((r) => {
      requestAnimationFrame(() => r());
    });
  }
  return getView();
}

/** 编辑器视图状态；文档内容以 tabs.activeTab 为准 */
export const useEditorStore = defineStore("editor", () => {
  const tabs = useTabsStore();
  const viewMode = ref<ViewMode>("hybrid");
  const splitRatio = ref(0.5);
  const cmView = shallowRef<EditorView | null>(null);
  const previewEl = shallowRef<HTMLElement | null>(null);
  const scrollSyncEnabled = ref(true);
  const focusMode = ref(false);
  const typewriterMode = ref(false);
  const statusBarVisible = ref(true);
  const spellCheckEnabled = ref(false);
  const picgoEnabled = ref(false);
  const picgoEndpoint = ref(DEFAULT_PICGO_ENDPOINT);
  const imageHosts = ref<ImageHostProfile[]>(createDefaultImageHosts());
  const activeImageHostId = ref(createDefaultImageHosts()[0]!.id);
  const windowMaterial = ref<"off" | "mica" | "acrylic">("off");
  /** 自绘标题栏（关系统边框）；默认开 */
  const customTitlebar = ref(true);
  /** 标题栏上的菜单按钮；关掉后仍可用 Alt 弹出 */
  const menuButtonVisible = ref(true);
  const ollamaEnabled = ref(false);
  const ollamaEndpoint = ref("http://127.0.0.1:11434");
  const ollamaModel = ref("llama3.2");
  const snapshotsEnabled = ref(true);
  const searchOpen = ref(false);
  const searchReplaceVisible = ref(false);
  /** 递增以强制 SearchBar 重新聚焦（含已打开时再按 Ctrl+F） */
  const searchFocusSeq = ref(0);

  const content = computed(() => tabs.activeTab.content);
  const dirty = computed(() => tabs.activeTab.dirty);
  const filePath = computed(() => tabs.activeTab.path);
  const fileName = computed(() => tabs.activeTab.name);
  const modeLabel = computed(() => {
    // 依赖 locale，切换语言时窗口标题一并更新
    void trackLocale();
    switch (viewMode.value) {
      case "hybrid":
        return t("shell.modeHybrid");
      case "source":
        return t("shell.modeSource");
      default:
        return t("shell.modeSplit");
    }
  });
  /** 标签/标题：未保存用 * */
  const title = computed(() =>
    dirty.value ? `${fileName.value} *` : fileName.value,
  );
  /** 窗口标题：文档[*] — Lunark 模式 */
  const windowTitle = computed(
    () => `${title.value} — Lunark ${modeLabel.value}`,
  );

  function setContent(value: string, markDirty = true) {
    tabs.setActiveContent(value, markDirty);
  }

  function markSaved() {
    tabs.markActiveSaved();
  }

  /** hybrid → source → split → hybrid（Ctrl+/） */
  function toggleViewMode() {
    const i = VIEW_CYCLE.indexOf(viewMode.value);
    if (i < 0) {
      console.warn("[lunark] invalid viewMode, reset to hybrid", viewMode.value);
      viewMode.value = "hybrid";
      return;
    }
    viewMode.value = VIEW_CYCLE[(i + 1) % VIEW_CYCLE.length]!;
  }

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode;
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

  function toggleScrollSync() {
    scrollSyncEnabled.value = !scrollSyncEnabled.value;
  }

  function setFocusMode(enabled: boolean) {
    focusMode.value = enabled;
  }

  function toggleFocusMode() {
    focusMode.value = !focusMode.value;
  }

  function setTypewriterMode(enabled: boolean) {
    typewriterMode.value = enabled;
  }

  function toggleTypewriterMode() {
    typewriterMode.value = !typewriterMode.value;
  }

  function setStatusBarVisible(visible: boolean) {
    statusBarVisible.value = visible;
  }

  function toggleStatusBar() {
    statusBarVisible.value = !statusBarVisible.value;
  }

  function setSpellCheckEnabled(enabled: boolean) {
    spellCheckEnabled.value = enabled;
  }

  function toggleSpellCheck() {
    spellCheckEnabled.value = !spellCheckEnabled.value;
  }

  function syncEndpointFromActiveHost() {
    const host = resolveActiveHost(
      imageHosts.value,
      activeImageHostId.value,
    );
    if (host) {
      picgoEndpoint.value = host.endpoint.trim() || DEFAULT_PICGO_ENDPOINT;
      activeImageHostId.value = host.id;
    }
  }

  function setPicgoEnabled(enabled: boolean) {
    picgoEnabled.value = enabled;
  }

  function togglePicgo() {
    picgoEnabled.value = !picgoEnabled.value;
  }

  function setPicgoEndpoint(url: string) {
    const ep = url.trim() || DEFAULT_PICGO_ENDPOINT;
    picgoEndpoint.value = ep;
    const host = resolveActiveHost(
      imageHosts.value,
      activeImageHostId.value,
    );
    if (host) {
      host.endpoint = ep;
    }
  }

  function setImageHosts(hosts: ImageHostProfile[]) {
    imageHosts.value =
      hosts.length > 0 ? hosts.map((h) => ({ ...h })) : createDefaultImageHosts();
    syncEndpointFromActiveHost();
  }

  function setActiveImageHostId(id: string) {
    activeImageHostId.value = id;
    syncEndpointFromActiveHost();
  }

  function setWindowMaterial(kind: "off" | "mica" | "acrylic") {
    windowMaterial.value = kind;
  }

  function setCustomTitlebar(enabled: boolean) {
    customTitlebar.value = enabled;
  }

  function toggleCustomTitlebar() {
    customTitlebar.value = !customTitlebar.value;
  }

  function setMenuButtonVisible(visible: boolean) {
    menuButtonVisible.value = visible;
  }

  function toggleMenuButton() {
    menuButtonVisible.value = !menuButtonVisible.value;
  }

  function setOllamaEnabled(enabled: boolean) {
    ollamaEnabled.value = enabled;
  }

  function toggleOllama() {
    ollamaEnabled.value = !ollamaEnabled.value;
  }

  function setOllamaEndpoint(url: string) {
    ollamaEndpoint.value = url.trim() || "http://127.0.0.1:11434";
  }

  function setOllamaModel(model: string) {
    ollamaModel.value = model.trim() || "llama3.2";
  }

  function setSnapshotsEnabled(enabled: boolean) {
    snapshotsEnabled.value = enabled;
  }

  function toggleSnapshots() {
    snapshotsEnabled.value = !snapshotsEnabled.value;
  }

  /** 在 CM 光标处插入；无编辑器时追加到文末 */
  function insertAtCursor(text: string) {
    const view = cmView.value;
    if (view) {
      insertTextAtCursor(view, text);
      setContent(view.state.doc.toString());
      return;
    }
    const next =
      content.value && !content.value.endsWith("\n")
        ? `${content.value}\n\n${text}\n`
        : `${content.value}${text}\n`;
    setContent(next);
  }

  function openSearch(opts?: { replace?: boolean }) {
    searchOpen.value = true;
    if (opts?.replace) searchReplaceVisible.value = true;
    searchFocusSeq.value += 1;
  }

  function closeSearch() {
    searchOpen.value = false;
  }

  function toggleSearchReplace() {
    searchReplaceVisible.value = !searchReplaceVisible.value;
  }

  function applyJumpToLine(view: EditorView, line: number) {
    const safeLine = Math.min(Math.max(line, 1), view.state.doc.lines);
    const lineInfo = view.state.doc.line(safeLine);
    view.dispatch({
      selection: { anchor: lineInfo.from },
      effects: EditorView.scrollIntoView(lineInfo.from, { y: "center" }),
    });
    view.focus();
  }

  /** 跳转到源码行（1-based） */
  function jumpToLine(line: number) {
    const needSwitch = viewMode.value === "hybrid";
    if (needSwitch) {
      viewMode.value = "source";
    }

    // 已在源码/双栏且 CM 就绪：同步跳转
    if (!needSwitch && cmView.value) {
      applyJumpToLine(cmView.value, line);
      return;
    }

    void waitForCmView(() => cmView.value).then((view) => {
      if (!view) {
        console.warn("[lunark] jumpToLine: CodeMirror not ready");
        return;
      }
      applyJumpToLine(view, line);
    });
  }

  /** 跳转到源码行（1-based）并滚动预览标题 */
  function jumpToHeading(line: number, headingId: string) {
    jumpToLine(line);

    void (async () => {
      for (let i = 0; i < 16; i++) {
        await nextTick();
        const el = document.getElementById(headingId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        await new Promise<void>((r) => {
          requestAnimationFrame(() => r());
        });
      }
    })();
  }

  return {
    content,
    dirty,
    viewMode,
    modeLabel,
    filePath,
    fileName,
    title,
    windowTitle,
    splitRatio,
    cmView,
    previewEl,
    scrollSyncEnabled,
    focusMode,
    typewriterMode,
    statusBarVisible,
    spellCheckEnabled,
    picgoEnabled,
    picgoEndpoint,
    imageHosts,
    activeImageHostId,
    windowMaterial,
    customTitlebar,
    menuButtonVisible,
    ollamaEnabled,
    ollamaEndpoint,
    ollamaModel,
    snapshotsEnabled,
    searchOpen,
    searchReplaceVisible,
    searchFocusSeq,
    setContent,
    markSaved,
    toggleViewMode,
    setViewMode,
    setSplitRatio,
    openDocument,
    setCmView,
    setPreviewEl,
    setScrollSyncEnabled,
    toggleScrollSync,
    setFocusMode,
    toggleFocusMode,
    setTypewriterMode,
    toggleTypewriterMode,
    setStatusBarVisible,
    toggleStatusBar,
    setSpellCheckEnabled,
    toggleSpellCheck,
    setPicgoEnabled,
    togglePicgo,
    setPicgoEndpoint,
    setImageHosts,
    setActiveImageHostId,
    setWindowMaterial,
    setCustomTitlebar,
    toggleCustomTitlebar,
    setMenuButtonVisible,
    toggleMenuButton,
    setOllamaEnabled,
    toggleOllama,
    setOllamaEndpoint,
    setOllamaModel,
    setSnapshotsEnabled,
    toggleSnapshots,
    insertAtCursor,
    openSearch,
    closeSearch,
    toggleSearchReplace,
    jumpToLine,
    jumpToHeading,
  };
});
