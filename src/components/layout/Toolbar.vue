<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { isTauri } from "@tauri-apps/api/core";
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { useTabsStore } from "@/stores/tabs";
import { useDocumentActions } from "@/composables/useDocumentActions";

const editor = useEditorStore();
const workspace = useWorkspaceStore();
const tabs = useTabsStore();
const {
  openFile,
  openFolder,
  newFile,
  saveFile,
  saveFileAs,
  exportHtml,
  exportPdf,
  closeActiveTab,
} = useDocumentActions();

const exportOpen = ref(false);
const tauri = isTauri();

function onToggleMode() {
  editor.toggleViewMode();
}

function closeExport() {
  exportOpen.value = false;
}

function toggleExport() {
  exportOpen.value = !exportOpen.value;
}

function onDocClick(e: MouseEvent) {
  const t = e.target as Node | null;
  const wrap = document.querySelector(".export-wrap");
  if (exportOpen.value && wrap && t && !wrap.contains(t)) {
    closeExport();
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
    case "lunark:menu-find":
      editor.openSearch({ replace: false });
      break;
    case "lunark:menu-replace":
      editor.openSearch({ replace: true });
      break;
    case "lunark:menu-export-html":
      void exportHtml();
      break;
    case "lunark:menu-export-pdf":
      void exportPdf();
      break;
    case "lunark:menu-toggle-mode":
      onToggleMode();
      break;
    case "lunark:menu-toggle-sidebar":
      workspace.toggleSidebar();
      break;
    default:
      break;
  }
}

const MENU_EVENTS = [
  "lunark:menu-open",
  "lunark:menu-open-folder",
  "lunark:menu-new",
  "lunark:menu-save",
  "lunark:menu-save-as",
  "lunark:menu-close-tab",
  "lunark:menu-find",
  "lunark:menu-replace",
  "lunark:menu-export-html",
  "lunark:menu-export-pdf",
  "lunark:menu-toggle-mode",
  "lunark:menu-toggle-sidebar",
] as const;

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    if (exportOpen.value) {
      e.preventDefault();
      closeExport();
      return;
    }
    if (editor.searchOpen) {
      e.preventDefault();
      editor.closeSearch();
      editor.cmView?.focus();
      return;
    }
  }

  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;

  const key = e.key.toLowerCase();

  // Ctrl+Tab / Ctrl+Shift+Tab：切标签（菜单未绑定，Tauri 下也要处理）
  if (key === "tab") {
    e.preventDefault();
    if (e.shiftKey) tabs.activatePrev();
    else tabs.activateNext();
    return;
  }

  // Tauri 下其余快捷键由原生菜单 accelerator 触发，避免双执行
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
  } else if (key === "f") {
    e.preventDefault();
    editor.openSearch({ replace: false });
  } else if (key === "h") {
    e.preventDefault();
    editor.openSearch({ replace: true });
  } else if (key === "/") {
    e.preventDefault();
    onToggleMode();
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  document.addEventListener("click", onDocClick);
  for (const ev of MENU_EVENTS) {
    window.addEventListener(ev, onMenuEvent);
  }
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  document.removeEventListener("click", onDocClick);
  for (const ev of MENU_EVENTS) {
    window.removeEventListener(ev, onMenuEvent);
  }
});
</script>

<template>
  <header class="toolbar">
    <div class="brand">
      <span class="logo">Lunark</span>
      <span class="phase">双栏</span>
    </div>

    <div class="doc-title" :title="editor.filePath ?? undefined">
      {{ editor.title }}
    </div>

    <div class="actions">
      <button
        type="button"
        class="btn"
        aria-label="切换侧栏"
        @click="workspace.toggleSidebar"
      >
        侧栏
      </button>
      <button
        type="button"
        class="btn"
        title="Ctrl+Shift+O"
        aria-label="打开文件夹"
        @click="openFolder"
      >
        文件夹
      </button>
      <button
        type="button"
        class="btn"
        title="Ctrl+O"
        aria-label="打开文件"
        @click="openFile"
      >
        打开
      </button>
      <button
        type="button"
        class="btn"
        title="Ctrl+N"
        aria-label="新建文件"
        @click="newFile"
      >
        新建
      </button>
      <button
        type="button"
        class="btn primary"
        title="Ctrl+S"
        aria-label="保存"
        @click="saveFile"
      >
        保存
      </button>
      <button
        type="button"
        class="btn"
        title="Ctrl+Shift+S"
        aria-label="另存为"
        @click="saveFileAs"
      >
        另存为
      </button>
      <button
        type="button"
        class="btn"
        title="Ctrl+/"
        aria-label="切换源码或双栏"
        @click="onToggleMode"
      >
        {{ editor.viewMode === "split" ? "仅源码" : "双栏" }}
      </button>
      <button
        type="button"
        class="btn"
        title="Ctrl+F"
        aria-label="查找"
        @click="editor.openSearch()"
      >
        查找
      </button>
      <button
        type="button"
        class="btn"
        :class="{ active: editor.scrollSyncEnabled }"
        :title="
          editor.scrollSyncEnabled
            ? '关闭双栏滚动联动'
            : '开启双栏滚动联动'
        "
        :aria-pressed="editor.scrollSyncEnabled"
        aria-label="双栏滚动联动"
        @click="editor.toggleScrollSync()"
      >
        联动
      </button>

      <div class="export-wrap">
        <button
          type="button"
          class="btn"
          aria-haspopup="menu"
          :aria-expanded="exportOpen"
          aria-label="导出"
          @click.stop="toggleExport"
        >
          导出
        </button>
        <div
          v-if="exportOpen"
          class="export-menu"
          role="menu"
          @click.stop
        >
          <div class="export-menu-inner">
            <button
              type="button"
              class="menu-item"
              role="menuitem"
              @click="exportHtml(); closeExport()"
            >
              导出 HTML
            </button>
            <button
              type="button"
              class="menu-item"
              role="menuitem"
              @click="exportPdf(); closeExport()"
            >
              导出 PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 40px;
  padding: 0 12px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 140px;
}

.logo {
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--heading-strong-color);
}

.phase {
  font-size: 11px;
  color: var(--control-text-color);
}

.doc-title {
  flex: 1;
  text-align: center;
  font-size: 13px;
  color: var(--control-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn {
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-color);
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
}

.btn:hover {
  background: var(--item-hover-bg-color);
  color: var(--item-hover-text-color);
}

.btn.primary {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.btn.primary:hover {
  background: rgba(109, 193, 231, 0.15);
}

.btn.active {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: rgba(109, 193, 231, 0.12);
}

.export-wrap {
  position: relative;
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  padding-top: 6px;
  min-width: 128px;
  z-index: 30;
}

.export-menu-inner {
  background: var(--side-bar-bg-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--text-color);
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
}

.menu-item:hover {
  background: var(--item-hover-bg-color);
  color: var(--item-hover-text-color);
}
</style>
