<script setup lang="ts">
/**
 * 菜单栏下一行：左侧侧栏；右侧字数 + 视图模式。
 */
import { computed } from "vue";
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { computeDocStats } from "@/lib/editor/wordStats";

const editor = useEditorStore();
const workspace = useWorkspaceStore();

const currentModeName = computed(() => {
  switch (editor.viewMode) {
    case "hybrid":
      return "混合";
    case "source":
      return "源码";
    default:
      return "双栏";
  }
});

const nextModeName = computed(() => {
  switch (editor.viewMode) {
    case "hybrid":
      return "源码";
    case "source":
      return "双栏";
    default:
      return "混合";
  }
});

/** 当前模式名 + 原有切换提示 */
const modeTitle = computed(
  () =>
    `视图：${currentModeName.value}（点击切换到${nextModeName.value} · Ctrl+/）`,
);

const stats = computed(() => computeDocStats(editor.content));
const wordsLabel = computed(() => `${stats.value.words} 词`);
const wordsTitle = computed(
  () =>
    `${stats.value.words} 词 · ${stats.value.chars} 字符 · ${stats.value.lines} 行`,
);
</script>

<template>
  <div class="menu-chrome" role="toolbar" aria-label="视图快捷操作">
    <button
      type="button"
      class="icon-btn"
      :class="{ active: workspace.sidebarVisible }"
      :title="workspace.sidebarVisible ? '隐藏侧栏' : '显示侧栏'"
      :aria-pressed="workspace.sidebarVisible"
      aria-label="侧栏"
      @click="workspace.toggleSidebar()"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          fill="currentColor"
          d="M2 2h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm0 1v10h3V3H2zm4 0v10h8V3H6z"
        />
      </svg>
    </button>

    <div class="spacer" />

    <button
      type="button"
      class="words"
      :title="wordsTitle"
      @click="editor.openSearch()"
    >
      {{ wordsLabel }}
    </button>

    <button
      type="button"
      class="icon-btn"
      :title="modeTitle"
      aria-label="切换视图模式"
      @click="editor.toggleViewMode()"
    >
      <svg
        v-if="editor.viewMode === 'hybrid'"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M2 3h12v2H2V3zm0 4h8v2H2V7zm0 4h10v2H2v-2z"
        />
      </svg>
      <svg
        v-else-if="editor.viewMode === 'source'"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M5.7 4.3 2 8l3.7 3.7.7-.7L3.4 8l3-.3.7-.7zm4.6 0-.7.7L12.6 8l-3 3.3-.7.7L14 8l-3.7-3.7z"
        />
      </svg>
      <svg v-else viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          fill="currentColor"
          d="M1 2h6v12H1V2zm8 0h6v12H9V2zM2 3v10h4V3H2zm8 0v10h4V3h-4z"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.menu-chrome {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 8px;
  flex-shrink: 0;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--border-color);
  gap: 2px;
}

.spacer {
  flex: 1;
  min-width: 8px;
}

.words {
  border: 0;
  background: transparent;
  color: var(--control-text-color);
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.words:hover {
  background: var(--item-hover-bg-color);
  color: var(--primary-color);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--control-text-color);
  cursor: pointer;
  flex-shrink: 0;
}

.icon-btn:hover {
  background: var(--item-hover-bg-color);
  color: var(--item-hover-text-color);
}

.icon-btn.active {
  color: var(--primary-color);
  background: rgba(109, 193, 231, 0.12);
}
</style>
