import { onMounted, onUnmounted } from "vue";
import { isTauri } from "@tauri-apps/api/core";
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { useTabsStore } from "@/stores/tabs";
import { useThemeStore } from "@/stores/theme";
import { useDocumentActions } from "@/composables/useDocumentActions";
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
  "lunark:menu-find",
  "lunark:menu-replace",
  "lunark:menu-find-workspace",
  "lunark:menu-export-html",
  "lunark:menu-export-pdf",
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
] as const;

/**
 * 原生菜单事件 + 快捷键桥接（无可见工具栏）。
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
    closeActiveTab,
    openPathInTab,
    clearRecentFiles,
    confirmCloseWithSave,
  } = useDocumentActions();

  const tauri = isTauri();

  async function quitApp() {
    const ok = await confirmCloseWithSave();
    if (!ok) return;
    if (!isTauri()) {
      window.close();
      return;
    }
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().destroy();
    } catch (e) {
      console.warn("[lunark] quit failed", e);
    }
  }

  function onMenuEvent(e: Event) {
    const type = (e as CustomEvent).type;
    switch (type) {
      case "lunark:menu-open":
        void openFile();
        break;
      case "lunark:menu-open-folder":
        void openFolder();
        break;
      case "lunark:menu-new":
        newFile();
        break;
      case "lunark:menu-save":
        void saveFile();
        break;
      case "lunark:menu-save-as":
        void saveFileAs();
        break;
      case "lunark:menu-close-tab":
        void closeActiveTab();
        break;
      case "lunark:menu-quit":
        void quitApp();
        break;
      case "lunark:menu-find":
        editor.openSearch({ replace: false });
        break;
      case "lunark:menu-replace":
        editor.openSearch({ replace: true });
        break;
      case "lunark:menu-find-workspace":
        workspace.setSidebarPanel("search");
        break;
      case "lunark:menu-export-html":
        void exportHtml();
        break;
      case "lunark:menu-export-pdf":
        void exportPdf();
        break;
      case "lunark:menu-toggle-mode":
        editor.toggleViewMode();
        break;
      case "lunark:menu-mode-hybrid":
        editor.setViewMode("hybrid");
        break;
      case "lunark:menu-mode-source":
        editor.setViewMode("source");
        break;
      case "lunark:menu-mode-split":
        editor.setViewMode("split");
        break;
      case "lunark:menu-toggle-sidebar":
        workspace.toggleSidebar();
        break;
      case "lunark:menu-toggle-focus":
        editor.toggleFocusMode();
        break;
      case "lunark:menu-toggle-typewriter":
        editor.toggleTypewriterMode();
        break;
      case "lunark:menu-toggle-status-bar":
        editor.toggleStatusBar();
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
        theme.setTheme(id);
        void refreshAppMenu();
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
        editor.closeSearch();
        editor.cmView?.focus();
        return;
      }
      if (editor.focusMode) {
        e.preventDefault();
        editor.setFocusMode(false);
        return;
      }
    }

    if (!tauri) {
      if (e.key === "F8") {
        e.preventDefault();
        editor.toggleFocusMode();
        return;
      }
      if (e.key === "F9") {
        e.preventDefault();
        editor.toggleTypewriterMode();
        return;
      }
    }

    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;

    const key = e.key.toLowerCase();

    if (key === "tab") {
      e.preventDefault();
      if (e.shiftKey) tabs.activatePrev();
      else tabs.activateNext();
      return;
    }

    if (tauri) return;

    if (key === "o" && e.shiftKey) {
      e.preventDefault();
      void openFolder();
    } else if (key === "o") {
      e.preventDefault();
      void openFile();
    } else if (key === "n") {
      e.preventDefault();
      newFile();
    } else if (key === "s" && e.shiftKey) {
      e.preventDefault();
      void saveFileAs();
    } else if (key === "s") {
      e.preventDefault();
      void saveFile();
    } else if (key === "w") {
      e.preventDefault();
      void closeActiveTab();
    } else if (key === "f" && e.shiftKey) {
      e.preventDefault();
      workspace.setSidebarPanel("search");
    } else if (key === "f") {
      e.preventDefault();
      editor.openSearch({ replace: false });
    } else if (key === "h") {
      e.preventDefault();
      editor.openSearch({ replace: true });
    } else if (key === "/") {
      e.preventDefault();
      editor.toggleViewMode();
    } else if (key === "q") {
      e.preventDefault();
      void quitApp();
    } else if (key === "\\") {
      e.preventDefault();
      workspace.toggleSidebar();
    }
  }

  onMounted(() => {
    window.addEventListener("keydown", onKeydown);
    for (const ev of MENU_EVENTS) {
      window.addEventListener(ev, onMenuEvent);
    }
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", onKeydown);
    for (const ev of MENU_EVENTS) {
      window.removeEventListener(ev, onMenuEvent);
    }
  });
}
