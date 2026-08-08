<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useTabsStore } from "@/stores/tabs";
import { useDocumentActions } from "@/composables/useDocumentActions";

const { t } = useI18n();
const tabs = useTabsStore();
const { closeTab, newFile } = useDocumentActions();

function onSelect(id: string) {
  tabs.activate(id);
}

function onClose(e: MouseEvent, id: string) {
  e.stopPropagation();
  void closeTab(id);
}

/** 双击标签栏空白 = 新建（对标常见编辑器） */
function onBarDblClick(e: MouseEvent) {
  const el = e.target as HTMLElement | null;
  if (!el) return;
  if (el.closest(".tab") || el.closest(".tab-new")) return;
  newFile();
}
</script>

<template>
  <div
    class="tab-bar"
    role="tablist"
    :aria-label="t('editor.openDocsAria')"
    @dblclick="onBarDblClick"
  >
    <div
      v-for="tab in tabs.tabs"
      :key="tab.id"
      class="tab"
      role="tab"
      tabindex="0"
      :aria-selected="tab.id === tabs.activeId"
      :class="{ active: tab.id === tabs.activeId, dirty: tab.dirty }"
      :title="tab.path ?? tab.name"
      @click="onSelect(tab.id)"
      @click.middle="closeTab(tab.id)"
      @keydown.enter.prevent="onSelect(tab.id)"
      @keydown.space.prevent="onSelect(tab.id)"
    >
      <span class="name">{{ tab.dirty ? `${tab.name} *` : tab.name }}</span>
      <button
        type="button"
        class="close"
        :aria-label="t('editor.closeTabNamed', { name: tab.name })"
        :title="t('editor.closeTab')"
        @click="onClose($event, tab.id)"
      >
        ×
      </button>
    </div>
    <button
      type="button"
      class="tab-new"
      :title="t('shell.newTab')"
      :aria-label="t('menu.new')"
      @click="newFile()"
    >
      +
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
  padding: 0 4px 0 12px;
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

.tab .name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab .close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.55;
  flex-shrink: 0;
}

.tab .close:hover {
  opacity: 1;
  background: rgba(112, 113, 125, 0.35);
}

.tab-new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: var(--control-text-color);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.tab-new:hover {
  color: var(--text-color);
  background: rgba(112, 113, 125, 0.25);
}
</style>
