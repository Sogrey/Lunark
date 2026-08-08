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

const { t } = useI18n();
const editor = useEditorStore();
const findInput = ref<HTMLInputElement | null>(null);
const query = ref("");
const replace = ref("");
const caseSensitive = ref(false);
const wholeWord = ref(false);
const matchIndex = ref(0);
const matchTotal = ref(0);

const matchLabel = computed(() => {
  if (!query.value) return "";
  if (matchTotal.value === 0) return t("editor.notFound");
  return `${matchIndex.value}/${matchTotal.value}`;
});

function applyQuery() {
  const view = editor.cmView;
  if (!view) return;
  view.dispatch({
    effects: setSearchQuery.of(
      new SearchQuery({
        search: query.value,
        replace: replace.value,
        caseSensitive: caseSensitive.value,
        wholeWord: wholeWord.value,
      }),
    ),
  });
  refreshMatchInfo(view);
}

function refreshMatchInfo(view: EditorView) {
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

function runFindNext() {
  applyQuery();
  const view = editor.cmView;
  if (view) {
    findNext(view);
    refreshMatchInfo(view);
  }
}

function runFindPrev() {
  applyQuery();
  const view = editor.cmView;
  if (view) {
    findPrevious(view);
    refreshMatchInfo(view);
  }
}

function runReplace() {
  applyQuery();
  const view = editor.cmView;
  if (view) {
    replaceNext(view);
    refreshMatchInfo(view);
  }
}

async function runReplaceAll() {
  applyQuery();
  const view = editor.cmView;
  if (!view || !query.value) return;
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

  replaceAll(view);
  refreshMatchInfo(view);
}

function onFindKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    if (e.shiftKey) runFindPrev();
    else runFindNext();
  } else if (e.key === "Escape") {
    e.preventDefault();
    editor.closeSearch();
    editor.cmView?.focus();
  }
}

function onReplaceKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    runReplace();
  } else if (e.key === "Escape") {
    e.preventDefault();
    editor.closeSearch();
    editor.cmView?.focus();
  }
}

watch(
  () => editor.searchOpen,
  async (open) => {
    if (!open) return;
    await nextTick();
    findInput.value?.focus();
    findInput.value?.select();
    applyQuery();
  },
);

watch([query, replace, caseSensitive, wholeWord], () => {
  if (editor.searchOpen) applyQuery();
});

onMounted(() => {
  if (editor.searchOpen) {
    findInput.value?.focus();
  }
});
</script>

<template>
  <div v-if="editor.searchOpen" class="search-bar" role="search">
    <div class="row">
      <input
        ref="findInput"
        v-model="query"
        class="field"
        type="text"
        :placeholder="t('editor.findPlaceholder')"
        :aria-label="t('editor.findAria')"
        @keydown="onFindKeydown"
      />
      <span
        class="match-count"
        :class="{ empty: matchTotal === 0 && !!query }"
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
