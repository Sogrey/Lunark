<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  SearchQuery,
  setSearchQuery,
  getSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
} from "@codemirror/search";
import type { EditorView } from "@codemirror/view";
import { ask } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "@/stores/editor";
import { getDocSearchBridge } from "@/lib/editor/docSearch";

const { t } = useI18n();
const editor = useEditorStore();
const findInput = ref<HTMLInputElement | null>(null);
const query = ref("");
const replace = ref("");
const caseSensitive = ref(false);
const wholeWord = ref(false);
const matchIndex = ref(0);
const matchTotal = ref(0);
/** 已对当前关键字执行过检索（回车/按钮）；改关键字后需再确认 */
const searchCommitted = ref(false);

const matchLabel = computed(() => {
  if (!query.value || !searchCommitted.value) return "";
  if (matchTotal.value === 0) return t("editor.notFound");
  return `${matchIndex.value}/${matchTotal.value}`;
});

const queryOpts = () => ({
  search: query.value,
  replace: replace.value,
  caseSensitive: caseSensitive.value,
  wholeWord: wholeWord.value,
});

function useCm(): EditorView | null {
  return editor.cmView;
}

function applyCmQuery(view: EditorView) {
  view.dispatch({
    effects: setSearchQuery.of(new SearchQuery(queryOpts())),
  });
}

function refreshCmMatchInfo(view: EditorView) {
  const q = getSearchQuery(view.state);
  if (!q.search) {
    matchIndex.value = 0;
    matchTotal.value = 0;
    return;
  }
  const matches: { from: number; to: number }[] = [];
  const cursor = q.getCursor(view.state.doc);
  for (let r = cursor.next(); !r.done; r = cursor.next()) {
    matches.push(r.value);
  }
  matchTotal.value = matches.length;
  if (matches.length === 0) {
    matchIndex.value = 0;
    return;
  }
  const head = view.state.selection.main.head;
  let idx = matches.findIndex((m) => m.from <= head && m.to >= head);
  if (idx < 0) {
    idx = matches.findIndex((m) => m.from >= head);
  }
  matchIndex.value = idx >= 0 ? idx + 1 : 1;
}

function applyInfo(info: { index: number; total: number }) {
  matchIndex.value = info.index;
  matchTotal.value = info.total;
}

/** 回车 / 搜索：跳到下一处；首次对该关键字则从当前位置往后找 */
function runFindNext() {
  if (!query.value) {
    matchIndex.value = 0;
    matchTotal.value = 0;
    searchCommitted.value = false;
    return;
  }
  searchCommitted.value = true;

  const view = useCm();
  if (view) {
    applyCmQuery(view);
    findNext(view);
    refreshCmMatchInfo(view);
  } else {
    const bridge = getDocSearchBridge();
    if (!bridge) return;
    bridge.setQuery(queryOpts());
    applyInfo(bridge.findNext());
  }
  keepFindFocus();
}

function runFindPrev() {
  if (!query.value) return;
  searchCommitted.value = true;

  const view = useCm();
  if (view) {
    applyCmQuery(view);
    findPrevious(view);
    refreshCmMatchInfo(view);
  } else {
    const bridge = getDocSearchBridge();
    if (!bridge) return;
    bridge.setQuery(queryOpts());
    applyInfo(bridge.findPrevious());
  }
  keepFindFocus();
}

function runReplace() {
  if (!query.value) return;
  searchCommitted.value = true;

  const view = useCm();
  if (view) {
    applyCmQuery(view);
    replaceNext(view);
    refreshCmMatchInfo(view);
  } else {
    const bridge = getDocSearchBridge();
    if (!bridge) return;
    bridge.setQuery(queryOpts());
    applyInfo(bridge.replaceNext());
  }
  keepFindFocus();
}

async function runReplaceAll() {
  if (!query.value) return;
  searchCommitted.value = true;

  // 先统计
  const view = useCm();
  const bridge = getDocSearchBridge();
  if (view) {
    applyCmQuery(view);
    refreshCmMatchInfo(view);
  } else if (bridge) {
    applyInfo(bridge.setQuery(queryOpts()));
  }
  if (matchTotal.value === 0) return;

  const confirmMsg = t("editor.replaceAllConfirm", { n: matchTotal.value });
  let ok = true;
  try {
    ok = await ask(confirmMsg, {
      title: "Lunark",
      kind: "warning",
    });
  } catch {
    ok = window.confirm(confirmMsg);
  }
  if (!ok) return;

  if (view) {
    replaceAll(view);
    refreshCmMatchInfo(view);
  } else if (bridge) {
    applyInfo(bridge.replaceAll());
  }
  keepFindFocus();
}

function keepFindFocus() {
  void nextTick(() => {
    findInput.value?.focus({ preventScroll: true });
  });
}

function onFindKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    if (e.shiftKey) runFindPrev();
    else runFindNext();
  } else if (e.key === "Escape") {
    e.preventDefault();
    editor.closeSearch();
    const bridge = getDocSearchBridge();
    if (editor.cmView) editor.cmView.focus();
    else bridge?.focusEditor();
  }
}

function onReplaceKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    runReplace();
  } else if (e.key === "Escape") {
    e.preventDefault();
    editor.closeSearch();
    const bridge = getDocSearchBridge();
    if (editor.cmView) editor.cmView.focus();
    else bridge?.focusEditor();
  }
}

watch(
  () => [editor.searchOpen, editor.searchFocusSeq] as const,
  async ([open]) => {
    if (!open) return;
    await focusFindInput();
  },
);

watch([query, caseSensitive, wholeWord], () => {
  // 改关键字后视为未提交，避免未按回车就跳转
  searchCommitted.value = false;
  matchIndex.value = 0;
  matchTotal.value = 0;
});

onMounted(() => {
  if (editor.searchOpen) {
    void focusFindInput();
  }
});

async function focusFindInput() {
  await nextTick();
  for (let i = 0; i < 8; i += 1) {
    const el = findInput.value;
    if (el) {
      el.focus({ preventScroll: true });
      el.select();
      if (document.activeElement === el) return;
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 20 * i));
    }
  }
}
</script>

<template>
  <div v-if="editor.searchOpen" class="search-bar" role="search">
    <div class="row">
      <input
        ref="findInput"
        v-model="query"
        class="field"
        type="text"
        autofocus
        :placeholder="t('editor.findPlaceholder')"
        :aria-label="t('editor.findAria')"
        @keydown="onFindKeydown"
      />
      <span
        class="match-count"
        :class="{ empty: searchCommitted && matchTotal === 0 && !!query }"
        aria-live="polite"
      >
        {{ matchLabel }}
      </span>
      <button
        type="button"
        class="btn"
        :title="t('editor.findPrev')"
        @click="runFindPrev"
      >
        ↑
      </button>
      <button
        type="button"
        class="btn primary"
        :title="t('editor.findNext')"
        @click="runFindNext"
      >
        {{ t("editor.searchGo") }}
      </button>
      <button
        type="button"
        class="btn"
        :title="t('editor.findNext')"
        @click="runFindNext"
      >
        ↓
      </button>
      <label class="check">
        <input v-model="caseSensitive" type="checkbox" />
        {{ t("editor.matchCase") }}
      </label>
      <label class="check">
        <input v-model="wholeWord" type="checkbox" />
        {{ t("editor.wholeWord") }}
      </label>
      <button
        type="button"
        class="btn"
        :class="{ active: editor.searchReplaceVisible }"
        @click="editor.toggleSearchReplace()"
      >
        {{ t("editor.toggleReplace") }}
      </button>
      <button type="button" class="btn ghost" title="Esc" @click="editor.closeSearch()">
        ✕
      </button>
    </div>
    <div v-if="editor.searchReplaceVisible" class="row">
      <input
        v-model="replace"
        class="field"
        type="text"
        :placeholder="t('editor.replacePlaceholder')"
        :aria-label="t('editor.replaceAria')"
        @keydown="onReplaceKeydown"
      />
      <button type="button" class="btn" @click="runReplace">
        {{ t("editor.replace") }}
      </button>
      <button type="button" class="btn" @click="runReplaceAll">
        {{ t("editor.replaceAll") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  flex-shrink: 0;
  padding: 6px 10px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.field {
  flex: 1;
  min-width: 140px;
  max-width: 320px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-color);
  color: var(--text-color);
  font-size: 13px;
  font-family: var(--font-ui);
}

.field:focus {
  outline: none;
  border-color: var(--primary-color);
}

.match-count {
  min-width: 4.5em;
  font-size: 12px;
  color: var(--control-text-color);
  text-align: center;
  user-select: none;
}

.match-count.empty {
  color: var(--danger-color, #e57373);
}

.btn {
  height: 28px;
  min-width: 28px;
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: transparent;
  color: var(--text-color);
  font-size: 12px;
  cursor: pointer;
}

.btn:hover,
.btn.active {
  background: var(--item-hover-bg-color);
  color: var(--item-hover-text-color);
}

.btn.primary {
  background: var(--primary-color, #3a7afe);
  border-color: var(--primary-color, #3a7afe);
  color: #fff;
  padding: 0 10px;
}

.btn.primary:hover {
  filter: brightness(1.05);
  color: #fff;
}

.btn.ghost {
  border-color: transparent;
  color: var(--control-text-color);
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--control-text-color);
  user-select: none;
  cursor: pointer;
}

.check input {
  margin: 0;
}
</style>
