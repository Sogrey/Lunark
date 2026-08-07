<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { computeDocStats } from "@/lib/editor/wordStats";

const editor = useEditorStore();
const workspace = useWorkspaceStore();

const selectionChars = ref(0);
const tip = ref("Ctrl+/ 切换视图");

const tips = [
  "Ctrl+/ 切换 混合 / 源码 / 双栏",
  "Ctrl+Shift+F 工作区搜索",
  "F8 专注 · Esc 退出",
  "F9 打字机模式",
  "Ctrl+S 保存",
];

let tipTimer: ReturnType<typeof setInterval> | null = null;
let tipIndex = 0;

const stats = computed(() => computeDocStats(editor.content));

const wordsLabel = computed(() => {
  if (selectionChars.value > 0) {
    return `选中 ${selectionChars.value} · ${stats.value.words} 词`;
  }
  return `${stats.value.words} 词`;
});

const detailTitle = computed(
  () =>
    `${stats.value.words} 词 · ${stats.value.chars} 字符 · ${stats.value.lines} 行`,
);

function refreshSelection() {
  const view = editor.cmView;
  if (view && editor.viewMode !== "hybrid") {
    const { from, to } = view.state.selection.main;
    selectionChars.value = to > from ? to - from : 0;
    return;
  }
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.toString()) {
    selectionChars.value = 0;
    return;
  }
  selectionChars.value = sel.toString().length;
}

function setMode(mode: "hybrid" | "source" | "split") {
  editor.setViewMode(mode);
}

watch(
  () => [editor.content, editor.cmView, editor.viewMode] as const,
  () => refreshSelection(),
);

onMounted(() => {
  document.addEventListener("selectionchange", refreshSelection);
  tipTimer = setInterval(() => {
    tipIndex = (tipIndex + 1) % tips.length;
    tip.value = tips[tipIndex]!;
  }, 8000);
});

onUnmounted(() => {
  document.removeEventListener("selectionchange", refreshSelection);
  if (tipTimer) clearInterval(tipTimer);
});
</script>

<template>
  <footer class="status-bar" role="status" aria-live="polite">
    <div class="left">
      <button
        type="button"
        class="chip"
        :class="{ active: workspace.sidebarVisible }"
        :title="workspace.sidebarVisible ? '隐藏侧栏' : '显示侧栏'"
        :aria-pressed="workspace.sidebarVisible"
        @click="workspace.toggleSidebar()"
      >
        侧栏
      </button>

      <span class="sep" aria-hidden="true" />

      <button
        type="button"
        class="chip"
        :class="{ active: editor.viewMode === 'hybrid' }"
        title="混合编辑"
        :aria-pressed="editor.viewMode === 'hybrid'"
        @click="setMode('hybrid')"
      >
        混合
      </button>
      <button
        type="button"
        class="chip icon"
        :class="{ active: editor.viewMode === 'source' }"
        title="源码"
        :aria-pressed="editor.viewMode === 'source'"
        @click="setMode('source')"
      >
        &lt;/&gt;
      </button>
      <button
        type="button"
        class="chip"
        :class="{ active: editor.viewMode === 'split' }"
        title="双栏"
        :aria-pressed="editor.viewMode === 'split'"
        @click="setMode('split')"
      >
        双栏
      </button>

      <template v-if="editor.viewMode === 'split'">
        <span class="sep" aria-hidden="true" />
        <button
          type="button"
          class="chip"
          :class="{ active: editor.scrollSyncEnabled }"
          :title="
            editor.scrollSyncEnabled ? '关闭滚动联动' : '开启滚动联动'
          "
          :aria-pressed="editor.scrollSyncEnabled"
          @click="editor.toggleScrollSync()"
        >
          联动
        </button>
      </template>

      <button
        v-if="editor.focusMode"
        type="button"
        class="chip warn"
        title="退出专注 (Esc)"
        @click="editor.setFocusMode(false)"
      >
        专注 ×
      </button>
      <button
        v-if="editor.typewriterMode"
        type="button"
        class="chip warn"
        title="关闭打字机 (F9)"
        @click="editor.setTypewriterMode(false)"
      >
        打字机 ×
      </button>
    </div>

    <div class="center" :title="tip">{{ tip }}</div>

    <div class="right">
      <button
        type="button"
        class="words"
        :title="detailTitle"
        @click="editor.openSearch()"
      >
        {{ wordsLabel }}
      </button>
    </div>
  </footer>
</template>

<style scoped>
.status-bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 10px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--control-text-color);
  background: var(--toolbar-bg);
  border-top: 1px solid var(--border-color);
  user-select: none;
}

.left {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.center {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
  text-align: center;
  font-size: 11px;
  opacity: 0.75;
}

.right {
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.chip {
  border: 0;
  background: transparent;
  color: var(--control-text-color);
  padding: 2px 7px;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  line-height: 1.4;
}

.chip.icon {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: -0.04em;
}

.chip:hover {
  background: var(--item-hover-bg-color);
  color: var(--item-hover-text-color);
}

.chip.active {
  color: var(--primary-color);
  background: rgba(109, 193, 231, 0.12);
}

.chip.warn {
  color: var(--primary-color);
}

.sep {
  width: 1px;
  height: 12px;
  margin: 0 4px;
  background: var(--border-color);
}

.words {
  border: 0;
  background: transparent;
  color: var(--control-text-color);
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
}

.words:hover {
  color: var(--primary-color);
}
</style>
