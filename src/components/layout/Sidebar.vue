<script setup lang="ts">
import FileTreeNode from "@/components/sidebar/FileTreeNode.vue";
import OutlinePanel from "@/components/sidebar/OutlinePanel.vue";
import { useWorkspaceStore } from "@/stores/workspace";
import { useDocumentActions } from "@/composables/useDocumentActions";

const workspace = useWorkspaceStore();
const { openPathInTab, openFolder, refreshFolder } = useDocumentActions();
</script>

<template>
  <aside class="sidebar">
    <div class="panel-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="panel-tab"
        :aria-selected="workspace.sidebarPanel === 'files'"
        :class="{ active: workspace.sidebarPanel === 'files' }"
        @click="workspace.setSidebarPanel('files')"
      >
        文件
      </button>
      <button
        type="button"
        role="tab"
        class="panel-tab"
        :aria-selected="workspace.sidebarPanel === 'outline'"
        :class="{ active: workspace.sidebarPanel === 'outline' }"
        @click="workspace.setSidebarPanel('outline')"
      >
        大纲
      </button>
    </div>

    <div v-if="workspace.sidebarPanel === 'files'" class="panel-body">
      <div class="section-head">
        <div class="root-label" :title="workspace.rootPath ?? undefined">
          {{ workspace.rootName ?? "工作区" }}
        </div>
        <div class="section-actions">
          <button
            type="button"
            class="icon-btn"
            title="打开文件夹 (Ctrl+Shift+O)"
            aria-label="打开文件夹"
            @click="openFolder"
          >
            打开
          </button>
          <button
            type="button"
            class="icon-btn"
            title="刷新文件树"
            aria-label="刷新文件树"
            :disabled="!workspace.rootPath || workspace.treeLoading"
            @click="refreshFolder"
          >
            刷新
          </button>
        </div>
      </div>

      <div v-if="workspace.treeLoading" class="hint">正在扫描…</div>
      <template v-else-if="workspace.rootPath">
        <div v-if="workspace.tree.length === 0" class="hint">
          此文件夹下没有 Markdown 文件。
        </div>
        <div v-else class="tree">
          <FileTreeNode
            v-for="node in workspace.tree"
            :key="node.path"
            :node="node"
            :depth="0"
            @open-file="openPathInTab"
          />
        </div>
      </template>
      <p v-else class="hint">
        点击「打开」或工具栏「文件夹」选择工作区，列出其中的 `.md` 文件。
      </p>
    </div>

    <div v-else class="panel-body">
      <OutlinePanel />
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 248px;
  flex-shrink: 0;
  background: var(--side-bar-bg-color);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-tabs {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-color);
}

.panel-tab {
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--control-text-color);
  font-size: 12px;
  padding: 9px 8px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.panel-tab:hover {
  color: var(--text-color);
}

.panel-tab.active {
  color: var(--heading-strong-color);
  border-bottom-color: var(--primary-color);
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px 8px 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 2px 10px;
}

.root-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--heading-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--control-text-color);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
}

.icon-btn:hover:not(:disabled) {
  color: var(--item-hover-text-color);
  background: var(--item-hover-bg-color);
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.hint {
  margin: 0 6px 12px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--focus-dim-color);
}

.tree {
  min-height: 0;
}
</style>
