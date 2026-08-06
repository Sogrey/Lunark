<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { useDocumentActions } from "@/composables/useDocumentActions";

const editor = useEditorStore();
const workspace = useWorkspaceStore();
const {
  openFile,
  openFolder,
  newFile,
  saveFile,
  saveFileAs,
  exportHtml,
  exportPdf,
} = useDocumentActions();

const exportOpen = ref(false);

function onToggleMode() {
  editor.toggleViewMode();
}

function closeExport() {
  exportOpen.value = false;
}

function onKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  const key = e.key.toLowerCase();
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
  } else if (key === "/") {
    e.preventDefault();
    onToggleMode();
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <header class="toolbar">
    <div class="brand">
      <span class="logo">Lunark</span>
      <span class="phase">MVP · 双栏</span>
    </div>

    <div class="doc-title" :title="editor.filePath ?? undefined">
      {{ editor.title }}
    </div>

    <div class="actions">
      <button type="button" class="btn" @click="workspace.toggleSidebar">
        侧栏
      </button>
      <button type="button" class="btn" title="Ctrl+Shift+O" @click="openFolder">
        文件夹
      </button>
      <button type="button" class="btn" title="Ctrl+O" @click="openFile">
        打开
      </button>
      <button type="button" class="btn" title="Ctrl+N" @click="newFile">
        新建
      </button>
      <button type="button" class="btn primary" title="Ctrl+S" @click="saveFile">
        保存
      </button>
      <button type="button" class="btn" title="Ctrl+Shift+S" @click="saveFileAs">
        另存为
      </button>
      <button
        type="button"
        class="btn"
        title="Ctrl+/"
        @click="onToggleMode"
      >
        {{ editor.viewMode === "split" ? "仅源码" : "双栏" }}
      </button>

      <div class="export-wrap" @mouseleave="closeExport">
        <button
          type="button"
          class="btn"
          @click="exportOpen = !exportOpen"
        >
          导出
        </button>
        <div v-if="exportOpen" class="export-menu">
          <button
            type="button"
            class="menu-item"
            @click="exportHtml(); closeExport()"
          >
            导出 HTML
          </button>
          <button
            type="button"
            class="menu-item"
            @click="exportPdf(); closeExport()"
          >
            导出 PDF…
          </button>
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

.export-wrap {
  position: relative;
}

.export-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 120px;
  background: var(--side-bar-bg-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px;
  z-index: 20;
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
