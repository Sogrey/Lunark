<script setup lang="ts">
import { useTabsStore } from "@/stores/tabs";
import { useDocumentActions } from "@/composables/useDocumentActions";

const tabs = useTabsStore();
const { closeTab } = useDocumentActions();

function onSelect(id: string) {
  tabs.activate(id);
}

function onClose(e: MouseEvent, id: string) {
  e.stopPropagation();
  void closeTab(id);
}
</script>

<template>
  <div class="tab-bar" role="tablist">
    <button
      v-for="tab in tabs.tabs"
      :key="tab.id"
      type="button"
      class="tab"
      role="tab"
      :aria-selected="tab.id === tabs.activeId"
      :class="{ active: tab.id === tabs.activeId, dirty: tab.dirty }"
      :title="tab.path ?? tab.name"
      @click="onSelect(tab.id)"
      @click.middle="closeTab(tab.id)"
    >
      <span class="name">{{ tab.dirty ? `${tab.name} •` : tab.name }}</span>
      <span
        class="close"
        title="关闭"
        @click="onClose($event, tab.id)"
      >
        ×
      </span>
    </button>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  align-items: stretch;
  gap: 1px;
  height: 34px;
  flex-shrink: 0;
  background: var(--side-bar-bg-color);
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
  overflow-y: hidden;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 180px;
  padding: 0 8px 0 12px;
  border: 0;
  border-right: 1px solid var(--border-color);
  background: transparent;
  color: var(--control-text-color);
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
}

.tab:hover {
  background: rgba(112, 113, 125, 0.25);
  color: var(--text-color);
}

.tab.active {
  background: var(--bg-color);
  color: var(--active-file-text-color);
}

.tab.dirty .name {
  font-style: italic;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  font-size: 14px;
  line-height: 1;
  opacity: 0.55;
}

.close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.12);
}
</style>
