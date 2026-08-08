<script setup lang="ts">
import { useI18n } from "vue-i18n";
import FileTreeNode from "@/components/sidebar/FileTreeNode.vue";
import OutlinePanel from "@/components/sidebar/OutlinePanel.vue";
import GlobalSearchPanel from "@/components/sidebar/GlobalSearchPanel.vue";
import { useWorkspaceStore } from "@/stores/workspace";
import { useSessionStore } from "@/stores/session";
import { useDocumentActions } from "@/composables/useDocumentActions";

const { t } = useI18n();
const workspace = useWorkspaceStore();
const session = useSessionStore();
const { openPathInTab, openFolder, refreshFolder, clearRecentFiles } =
  useDocumentActions();
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
        {{ t("shell.files") }}
      </button>
      <button
        type="button"
        role="tab"
        class="panel-tab"
        :aria-selected="workspace.sidebarPanel === 'outline'"
        :class="{ active: workspace.sidebarPanel === 'outline' }"
        @click="workspace.setSidebarPanel('outline')"
      >
        {{ t("shell.outline") }}
      </button>
      <button
        type="button"
        role="tab"
        class="panel-tab"
        :aria-selected="workspace.sidebarPanel === 'search'"
        :class="{ active: workspace.sidebarPanel === 'search' }"
        title="Ctrl+Shift+F"
        @click="workspace.setSidebarPanel('search')"
      >
        {{ t("shell.search") }}
      </button>
    </div>

    <div v-if="workspace.sidebarPanel === 'files'" class="panel-body">
      <div class="section-head">
        <div class="root-label" :title="workspace.rootPath ?? undefined">
          {{ workspace.rootName ?? t("shell.workspace") }}
        </div>
        <div class="section-actions">
          <button
            type="button"
            class="icon-btn"
            :title="`${t('shell.openFolder')} (Ctrl+Shift+O)`"
            :aria-label="t('shell.openFolder')"
            @click="openFolder"
          >
            {{ t("shell.openFolder") }}
          </button>
          <button
            type="button"
            class="icon-btn"
            :title="t('shell.refresh')"
            :aria-label="t('shell.refresh')"
            :disabled="!workspace.rootPath || workspace.treeLoading"
            @click="refreshFolder"
          >
            {{ t("shell.refresh") }}
          </button>
        </div>
      </div>

      <div v-if="workspace.treeLoading" class="hint">
        {{ t("shell.scanning") }}
      </div>
      <template v-else-if="workspace.rootPath">
        <div v-if="workspace.tree.length === 0" class="hint">
          {{ t("editor.noMdInFolder") }}
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
      <p v-else class="hint">{{ t("shell.noWorkspace") }}</p>

      <div v-if="session.recentFiles.length > 0" class="recent">
        <div class="recent-head">
          <span class="recent-title">{{ t("shell.recentFiles") }}</span>
          <button
            type="button"
            class="icon-btn"
            :title="t('shell.clearRecent')"
            :aria-label="t('shell.clearRecent')"
            @click="clearRecentFiles"
          >
            {{ t("shell.clearRecent") }}
          </button>
        </div>
        <button
          v-for="item in session.recentFiles"
          :key="item.path"
          type="button"
          class="recent-item"
          :title="item.path"
          @click="openPathInTab(item.path)"
        >
          {{ item.name }}
        </button>
      </div>
    </div>

    <div v-else-if="workspace.sidebarPanel === 'outline'" class="panel-body">
      <OutlinePanel />
    </div>

    <div v-else class="panel-body">
      <GlobalSearchPanel />
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

.recent {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 2px 8px;
}

.recent-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--control-text-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.recent-item {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--text-color);
  font-size: 12px;
  padding: 5px 8px;
  border-radius: 3px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-item:hover {
  background: var(--item-hover-bg-color);
  color: var(--item-hover-text-color);
}
</style>
