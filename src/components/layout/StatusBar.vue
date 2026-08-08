<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { computeDocStats } from "@/lib/editor/wordStats";

const { t, locale } = useI18n();
const editor = useEditorStore();
const workspace = useWorkspaceStore();

const selectionChars = ref(0);
const tip = ref("");

const tipKeys = [
  "shell.tipToggleMode",
  "shell.tipWorkspaceSearch",
  "shell.tipFocus",
  "shell.tipTypewriter",
  "shell.tipSave",
] as const;

let tipTimer: ReturnType<typeof setInterval> | null = null;
let tipIndex = 0;

const stats = computed(() => computeDocStats(editor.content));

const wordsLabel = computed(() => {
  void locale.value;
  if (selectionChars.value > 0) {
    return t("shell.wordsSelected", {
      sel: selectionChars.value,
      n: stats.value.words,
    });
  }
  return t("shell.words", { n: stats.value.words });
});

const detailTitle = computed(() =>
  t("shell.wordsDetail", {
    words: stats.value.words,
    chars: stats.value.chars,
    lines: stats.value.lines,
  }),
);

const sidebarTitle = computed(() =>
  workspace.sidebarVisible ? t("shell.hideSidebar") : t("shell.showSidebar"),
);

function refreshTip() {
  tip.value = t(tipKeys[tipIndex]!);
}

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

watch(locale, () => refreshTip());

onMounted(() => {
  document.addEventListener("selectionchange", refreshSelection);
  refreshTip();
  tipTimer = setInterval(() => {
    tipIndex = (tipIndex + 1) % tipKeys.length;
    refreshTip();
  }, 8000);
});

onUnmounted(() => {
  document.removeEventListener("selectionchange", refreshSelection);
  if (tipTimer) clearInterval(tipTimer);
});
</script>

<template>
  <footer class="status-bar" role="status" aria-live="polite">
    <div class="left" role="toolbar" :aria-label="t('shell.viewToolbarAria')">
      <button
        type="button"
        class="icon-btn"
        :class="{ active: workspace.sidebarVisible }"
        :title="sidebarTitle"
        :aria-label="t('shell.sidebarAria')"
        :aria-pressed="workspace.sidebarVisible"
        @click="workspace.toggleSidebar()"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            fill="currentColor"
            d="M2 2h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm0 1v10h3V3H2zm4 0v10h8V3H6z"
          />
        </svg>
      </button>

      <span class="sep" aria-hidden="true" />

      <button
        type="button"
        class="icon-btn"
        :class="{ active: editor.viewMode === 'hybrid' }"
        :title="t('shell.modeHybrid')"
        :aria-label="t('shell.modeHybrid')"
        :aria-pressed="editor.viewMode === 'hybrid'"
        @click="setMode('hybrid')"
      >
        <!-- 混合：所见即所得（文本 + 光标） -->
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3 2.5h10a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5zM3.5 3v10h9V3h-9zm1.5 2h6v1h-6V5zm0 2.5h4v1h-4v-1zm0 2.5h5v1h-5v-1z"
          />
        </svg>
      </button>
      <button
        type="button"
        class="icon-btn"
        :class="{ active: editor.viewMode === 'source' }"
        :title="t('shell.modeSource')"
        :aria-label="t('shell.modeSource')"
        :aria-pressed="editor.viewMode === 'source'"
        @click="setMode('source')"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            fill="currentColor"
            d="M5.5 4.2 2.3 8l3.2 3.8-.9.8L1 8l3.6-4.6.9.8zm5 0 .9-.8L15 8l-3.6 4.6-.9-.8L13.7 8 10.5 4.2zM9.1 3l-2 10H5.9l2-10h1.2z"
          />
        </svg>
      </button>
      <button
        type="button"
        class="icon-btn"
        :class="{ active: editor.viewMode === 'split' }"
        :title="t('shell.modeSplit')"
        :aria-label="t('shell.modeSplit')"
        :aria-pressed="editor.viewMode === 'split'"
        @click="setMode('split')"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            fill="currentColor"
            d="M2 2.5h12A1.5 1.5 0 0 1 15.5 4v8a1.5 1.5 0 0 1-1.5 1.5H2A1.5 1.5 0 0 1 .5 12V4A1.5 1.5 0 0 1 2 2.5zm0 1A.5.5 0 0 0 1.5 4v8a.5.5 0 0 0 .5.5h5v-9H2zm6.5 0v9H14a.5.5 0 0 0 .5-.5V4a.5.5 0 0 0-.5-.5H8.5z"
          />
        </svg>
      </button>

      <button
        v-if="editor.focusMode"
        type="button"
        class="icon-btn warn"
        :title="`${t('menu.focusMode')} ×`"
        :aria-label="t('menu.focusMode')"
        @click="editor.setFocusMode(false)"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8 3.5c2.6 0 4.7 1.7 5.6 4-.9 2.3-3 4-5.6 4S3.3 9.8 2.4 7.5c.9-2.3 3-4 5.6-4zm0 1C5.9 4.5 4.2 5.8 3.4 7.5 4.2 9.2 5.9 10.5 8 10.5s3.8-1.3 4.6-3C11.8 5.8 10.1 4.5 8 4.5zm0 1.2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"
          />
        </svg>
      </button>
      <button
        v-if="editor.typewriterMode"
        type="button"
        class="icon-btn warn"
        :title="`${t('menu.typewriterMode')} ×`"
        :aria-label="t('menu.typewriterMode')"
        @click="editor.setTypewriterMode(false)"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3 3.5h10v1.2H3V3.5zm0 2.5h10V7H3V6zm0 2.5h6V10H3V8.5zM8.5 11h1.2v1.5H11v1H5.5v-1H7V11h1.5z"
          />
        </svg>
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
  padding: 0 8px;
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
  gap: 1px;
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

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--control-text-color);
  cursor: pointer;
  line-height: 0;
}

.icon-btn:hover {
  background: var(--item-hover-bg-color);
  color: var(--item-hover-text-color);
}

.icon-btn.active {
  color: var(--primary-color);
  background: rgba(109, 193, 231, 0.12);
}

.icon-btn.warn {
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
