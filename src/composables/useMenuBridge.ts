import { onMounted, onUnmounted, watch } from "vue";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ElMessage } from "element-plus";
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { useTabsStore } from "@/stores/tabs";
import { useThemeStore } from "@/stores/theme";
import { useDocumentActions } from "@/composables/useDocumentActions";
import { getFormatBridge } from "@/lib/editor/formatBridge";
import { isLocaleId, t } from "@/lib/i18n";
import { persistLocale } from "@/lib/prefs/persistence";
import { isThemeId } from "@/lib/theme/catalog";
import { refreshAppMenu } from "@/lib/appMenu";

const MENU_EVENTS = [
  "lunark:menu-open",
  "lunark:menu-open-folder",
  "lunark:menu-new",
  "lunark:menu-save",
  "lunark:menu-save-as",
  "lunark:menu-close-tab",
  "lunark:menu-quit",
  "lunark:menu-undo",
  "lunark:menu-redo",
  "lunark:menu-cut",
  "lunark:menu-copy",
  "lunark:menu-paste",
  "lunark:menu-select-all",
  "lunark:menu-find",
  "lunark:menu-replace",
  "lunark:menu-find-workspace",
  "lunark:menu-export-html",
  "lunark:menu-export-pdf",
  "lunark:menu-export-docx",
  "lunark:menu-export-png",
  "lunark:menu-toggle-mode",
  "lunark:menu-mode-hybrid",
  "lunark:menu-mode-source",
  "lunark:menu-mode-split",
  "lunark:menu-toggle-sidebar",
  "lunark:menu-toggle-focus",
  "lunark:menu-toggle-typewriter",
  "lunark:menu-toggle-status-bar",
  "lunark:menu-open-recent",
  "lunark:menu-clear-recent",
  "lunark:menu-theme",
  "lunark:menu-theme-import",
  "lunark:menu-theme-folder",
  "lunark:menu-theme-remove",
  "lunark:menu-locale",
] as const;

/** 菜单加速键与前端 keydown 可能双触发（Windows 偶发）；短窗内同 action 只执行一次 */
const recentActions = new Map<string, number>();
function once(actionId: string, fn: () => void, windowMs = 250) {
  const now = Date.now();
  // 先清过期项，避免长会话 Map 只增不减（R-05）
  for (const [key, at] of recentActions) {
    if (now - at >= windowMs) recentActions.delete(key);
  }
  const prev = recentActions.get(actionId);
  if (prev != null && now - prev < windowMs) return;
  recentActions.set(actionId, now);
  fn();
}

/**
 * 原生菜单事件 + 快捷键桥接（无可见工具栏）。
 *
 * Windows/WebView2 下菜单 accelerator 常因焦点在编辑器而不触发；
 * 因此桌面与浏览器一律在前端绑定快捷键，菜单点击仍走 CustomEvent。
 */
export function useMenuBridge() {
  const editor = useEditorStore();
  const workspace = useWorkspaceStore();
  const tabs = useTabsStore();
  const theme = useThemeStore();
  const {
    openFile,
    openFolder,
    newFile,
    saveFile,
    saveFileAs,
    exportHtml,
    exportPdf,
    exportPng,
    exportDocx,
    closeActiveTab,
    openPathInTab,
    clearRecentFiles,
    confirmCloseWithSave,
  } = useDocumentActions();

  const tauri = isTauri();

  /** 全选正文：清掉壳层 DOM 选区，再选编辑器文档 */
  function selectEditorAll() {
    window.getSelection()?.removeAllRanges();
    const bridge = getFormatBridge();
    bridge?.focus();
    bridge?.selectAll();
  }

  async function cutEditor() {
    const bridge = getFormatBridge();
    if (!bridge) return;
    bridge.focus();
    const text = bridge.getSelectedText();
    if (text) await navigator.clipboard.writeText(text);
    bridge.deleteSelection();
  }

  async function copyEditor() {
    const bridge = getFormatBridge();
    if (!bridge) return;
    bridge.focus();
    const text = bridge.getSelectedText();
    if (text) await navigator.clipboard.writeText(text);
  }

  async function pasteEditor() {
    const bridge = getFormatBridge();
    if (!bridge) return;
    bridge.focus();
    try {
      const text = await navigator.clipboard.readText();
      if (text) bridge.replaceSelection(text);
    } catch {
      /* denied */
    }
  }

  async function quitApp() {
    const ok = await confirmCloseWithSave();
    if (!ok) return;
    if (!isTauri()) {
      window.close();
      return;
    }
    try {
      await getCurrentWindow().destroy();
    } catch (e) {
      console.warn("[lunark] quit failed", e);
    }
  }

  function onMenuEvent(e: Event) {
    const type = (e as CustomEvent).type;
    switch (type) {
      case "lunark:menu-open":
        once("open", () => void openFile());
        break;
      case "lunark:menu-open-folder":
        once("open-folder", () => void openFolder());
        break;
      case "lunark:menu-new":
        once("new", () => newFile());
        break;
      case "lunark:menu-save":
        once("save", () => void saveFile());
        break;
      case "lunark:menu-save-as":
        once("save-as", () => void saveFileAs());
        break;
      case "lunark:menu-close-tab":
        once("close-tab", () => void closeActiveTab());
        break;
      case "lunark:menu-quit":
        once("quit", () => void quitApp());
        break;
      case "lunark:menu-undo":
        once("undo", () => getFormatBridge()?.undo());
        break;
      case "lunark:menu-redo":
        once("redo", () => getFormatBridge()?.redo());
        break;
      case "lunark:menu-cut":
        once("cut", () => void cutEditor());
        break;
      case "lunark:menu-copy":
        once("copy", () => void copyEditor());
        break;
      case "lunark:menu-paste":
        once("paste", () => void pasteEditor());
        break;
      case "lunark:menu-select-all":
        once("select-all", () => selectEditorAll());
        break;
      case "lunark:menu-find":
        once("find", () => editor.openSearch({ replace: false }));
        break;
      case "lunark:menu-replace":
        once("replace", () => editor.openSearch({ replace: true }));
        break;
      case "lunark:menu-find-workspace":
        once("find-workspace", () => {
          if (editor.focusMode) editor.setFocusMode(false);
          workspace.setSidebarPanel("search");
        });
        break;
      case "lunark:menu-export-html":
        once("export-html", () => void exportHtml());
        break;
      case "lunark:menu-export-pdf":
        once("export-pdf", () => void exportPdf());
        break;
      case "lunark:menu-export-docx":
        once("export-docx", () => void exportDocx());
        break;
      case "lunark:menu-export-png":
        once("export-png", () => void exportPng());
        break;
      case "lunark:menu-toggle-mode":
        once("toggle-mode", () => editor.toggleViewMode());
        break;
      case "lunark:menu-mode-hybrid":
        once("mode-hybrid", () => editor.setViewMode("hybrid"));
        break;
      case "lunark:menu-mode-source":
        once("mode-source", () => editor.setViewMode("source"));
        break;
      case "lunark:menu-mode-split":
        once("mode-split", () => editor.setViewMode("split"));
        break;
      case "lunark:menu-toggle-sidebar":
        once("toggle-sidebar", () => workspace.toggleSidebar());
        break;
      case "lunark:menu-toggle-focus":
        once("toggle-focus", () => editor.toggleFocusMode());
        break;
      case "lunark:menu-toggle-typewriter":
        once("toggle-typewriter", () => editor.toggleTypewriterMode());
        break;
      case "lunark:menu-toggle-status-bar":
        once("toggle-status-bar", () => editor.toggleStatusBar());
        break;
      case "lunark:menu-open-recent": {
        const path = (e as CustomEvent).detail;
        if (typeof path === "string" && path) void openPathInTab(path);
        break;
      }
      case "lunark:menu-clear-recent":
        void clearRecentFiles();
        break;
      case "lunark:menu-theme": {
        const id = (e as CustomEvent).detail;
        if (!isThemeId(id)) break;
        void theme.setTheme(id).then(() => refreshAppMenu());
        break;
      }
      case "lunark:menu-theme-import":
        void theme
          .importTheme()
          .then((entry) => {
            if (entry) {
              ElMessage.success(
                t("msg.themeImported", { name: entry.label }),
              );
            }
            return refreshAppMenu();
          })
          .catch((err: unknown) => {
            ElMessage.error(
              err instanceof Error ? err.message : t("msg.themeImportFail"),
            );
          });
        break;
      case "lunark:menu-theme-folder":
        void theme.revealThemesFolder().catch((err: unknown) => {
          ElMessage.warning(
            err instanceof Error ? err.message : t("msg.themeFolderFail"),
          );
        });
        break;
      case "lunark:menu-theme-remove":
        void theme
          .removeActiveCustomTheme()
          .then((ok) => {
            if (ok) ElMessage.success(t("msg.themeRemoved"));
            return refreshAppMenu();
          })
          .catch((err: unknown) => {
            ElMessage.error(
              err instanceof Error ? err.message : t("msg.themeRemoveFail"),
            );
          });
        break;
      case "lunark:menu-locale": {
        const id = (e as CustomEvent).detail;
        if (isLocaleId(id)) void persistLocale(id);
        break;
      }
      default:
        break;
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      if (editor.searchOpen) {
        e.preventDefault();
        e.stopPropagation();
        editor.closeSearch();
        editor.cmView?.focus();
        return;
      }
      if (editor.focusMode) {
        e.preventDefault();
        e.stopPropagation();
        editor.setFocusMode(false);
        return;
      }
    }

    if (e.key === "F1") {
      e.preventDefault();
      e.stopPropagation();
      once("help-shortcuts", () => {
        window.dispatchEvent(
          new CustomEvent("lunark:help", { detail: "shortcuts" }),
        );
      });
      return;
    }

    if (e.key === "F8") {
      e.preventDefault();
      e.stopPropagation();
      once("toggle-focus", () => editor.toggleFocusMode());
      return;
    }

    if (e.key === "F9") {
      e.preventDefault();
      e.stopPropagation();
      once("toggle-typewriter", () => editor.toggleTypewriterMode());
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;

    // 用 e.code 判字母键，避免 Shift/布局导致 e.key 不稳定
    const code = e.code;
    const key = e.key.toLowerCase();

    if (key === "tab" || code === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) tabs.activatePrev();
      else tabs.activateNext();
      return;
    }

    // 桌面 + 浏览器统一前端绑定（Windows 菜单加速键不可靠）
    if (code === "KeyO" && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      once("open-folder", () => void openFolder());
    } else if (code === "KeyO") {
      e.preventDefault();
      e.stopPropagation();
      once("open", () => void openFile());
    } else if (code === "KeyN") {
      e.preventDefault();
      e.stopPropagation();
      once("new", () => newFile());
    } else if (code === "KeyA" && !e.shiftKey && !e.altKey) {
      // 拦截 WebView 默认全选（会选中标签栏等），只全选正文
      e.preventDefault();
      e.stopPropagation();
      once("select-all", () => selectEditorAll());
    } else if (code === "KeyS" && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      once("save-as", () => void saveFileAs());
    } else if (code === "KeyS") {
      e.preventDefault();
      e.stopPropagation();
      once("save", () => void saveFile());
    } else if (code === "KeyW") {
      e.preventDefault();
      e.stopPropagation();
      once("close-tab", () => void closeActiveTab());
    } else if (code === "KeyF" && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      once("find-workspace", () => {
        if (editor.focusMode) editor.setFocusMode(false);
        workspace.setSidebarPanel("search");
      });
    } else if (code === "KeyF") {
      e.preventDefault();
      e.stopPropagation();
      once("find", () => editor.openSearch({ replace: false }));
    } else if (code === "KeyH") {
      e.preventDefault();
      e.stopPropagation();
      once("replace", () => editor.openSearch({ replace: true }));
    } else if (key === "/" || code === "Slash" || code === "NumpadDivide") {
      e.preventDefault();
      e.stopPropagation();
      once("toggle-mode", () => editor.toggleViewMode());
    } else if (code === "KeyQ") {
      e.preventDefault();
      e.stopPropagation();
      once("quit", () => void quitApp());
    } else if (key === "\\" || code === "Backslash") {
      e.preventDefault();
      e.stopPropagation();
      once("toggle-sidebar", () => workspace.toggleSidebar());
    }
  }

  // 开关类菜单项勾选态随 store 刷新（状态栏 / 侧栏 / 模式等）
  let menuCheckTimer: ReturnType<typeof setTimeout> | null = null;
  const stopMenuCheckWatch = tauri
    ? watch(
        () =>
          [
            editor.viewMode,
            editor.focusMode,
            editor.typewriterMode,
            editor.statusBarVisible,
            workspace.sidebarVisible,
          ] as const,
        () => {
          if (menuCheckTimer) clearTimeout(menuCheckTimer);
          menuCheckTimer = setTimeout(() => {
            menuCheckTimer = null;
            void refreshAppMenu();
          }, 50);
        },
      )
    : null;

  onMounted(() => {
    // capture：抢在 WebView/编辑器默认行为之前（尤其 Ctrl+F）
    window.addEventListener("keydown", onKeydown, true);
    for (const ev of MENU_EVENTS) {
      window.addEventListener(ev, onMenuEvent);
    }
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", onKeydown, true);
    for (const ev of MENU_EVENTS) {
      window.removeEventListener(ev, onMenuEvent);
    }
    stopMenuCheckWatch?.();
    if (menuCheckTimer) clearTimeout(menuCheckTimer);
  });
}
