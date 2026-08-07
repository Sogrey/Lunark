<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useWorkspaceStore } from "@/stores/workspace";
import { useEditorStore } from "@/stores/editor";
import { useDocumentActions } from "@/composables/useDocumentActions";
import {
  searchWorkspaceMarkdown,
  type WorkspaceSearchHit,
} from "@/lib/fs/workspaceSearch";

const workspace = useWorkspaceStore();
const editor = useEditorStore();
const { openPathInTab } = useDocumentActions();

const query = ref("");
const caseSensitive = ref(false);
const searching = ref(false);
const hits = ref<WorkspaceSearchHit[]>([]);
const searched = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);

async function runSearch() {
  const q = query.value.trim();
  if (!q) {
    hits.value = [];
    searched.value = false;
    return;
  }
  if (!workspace.rootPath) {
    ElMessage.info("请先打开工作区文件夹");
    return;
  }
  if (workspace.tree.length === 0) {
    ElMessage.info("工作区中没有 Markdown 文件");
    return;
  }

  searching.value = true;
  searched.value = true;
  try {
    hits.value = await searchWorkspaceMarkdown(workspace.tree, q, {
      caseSensitive: caseSensitive.value,
    });
  } catch (e) {
    hits.value = [];
    ElMessage.error(e instanceof Error ? e.message : "搜索失败");
  } finally {
    searching.value = false;
  }
}

async function openHit(hit: WorkspaceSearchHit) {
  if (editor.viewMode === "hybrid") {
    editor.setViewMode("source");
  }
  await openPathInTab(hit.path);
  for (let i = 0; i < 12; i++) {
    await nextTick();
    if (editor.cmView) {
      editor.jumpToLine(hit.line);
      return;
    }
    await new Promise((r) => setTimeout(r, 40));
  }
  editor.jumpToLine(hit.line);
}

function focusInput() {
  void nextTick(() => inputEl.value?.focus());
}

watch(
  () => workspace.sidebarPanel,
  (panel) => {
    if (panel === "search") focusInput();
  },
);

onMounted(() => {
  if (workspace.sidebarPanel === "search") focusInput();
});

defineExpose({ focusInput, runSearch });
</script>

<template>
  <div class="global-search">
    <form class="search-form" @submit.prevent="runSearch">
      <input
        ref="inputEl"
        v-model="query"
        class="query"
        type="search"
        placeholder="在工作区中搜索…"
        autocomplete="off"
        spellcheck="false"
      />
      <label class="opt">
        <input v-model="caseSensitive" type="checkbox" />
        区分大小写
      </label>
      <button type="submit" class="go" :disabled="searching">
        {{ searching ? "搜索中…" : "搜索" }}
      </button>
    </form>

    <p v-if="!workspace.rootPath" class="hint">
      请先打开文件夹，再搜索其中的 `.md` 内容。
    </p>
    <p v-else-if="searching" class="hint">正在扫描…</p>
    <p v-else-if="searched && hits.length === 0" class="hint">未找到匹配。</p>
    <p v-else-if="hits.length > 0" class="hint meta">
      {{ hits.length }} 处匹配
      <span v-if="hits.length >= 200">（已截断）</span>
    </p>

    <ul v-if="hits.length > 0" class="results">
      <li v-for="(hit, i) in hits" :key="`${hit.path}:${hit.line}:${i}`">
        <button type="button" class="hit" @click="openHit(hit)">
          <span class="hit-file">{{ hit.name }}</span>
          <span class="hit-line">:{{ hit.line }}</span>
          <span class="hit-preview">{{ hit.preview }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.global-search {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.query {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-color);
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
}

.query:focus {
  outline: 1px solid var(--primary-color);
  border-color: var(--primary-color);
}

.opt {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--control-text-color);
  cursor: pointer;
  user-select: none;
}

.go {
  border: 1px solid var(--primary-color);
  background: transparent;
  color: var(--primary-color);
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 12px;
  cursor: pointer;
}

.go:hover:not(:disabled) {
  background: rgba(109, 193, 231, 0.12);
}

.go:disabled {
  opacity: 0.5;
  cursor: default;
}

.hint {
  margin: 4px 2px 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--focus-dim-color);
}

.hint.meta {
  color: var(--control-text-color);
}

.results {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
}

.hit {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--text-color);
  padding: 6px 6px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.35;
}

.hit:hover {
  background: var(--item-hover-bg-color);
}

.hit-file {
  color: var(--primary-color);
  font-weight: 600;
}

.hit-line {
  color: var(--control-text-color);
  margin-right: 6px;
}

.hit-preview {
  display: block;
  margin-top: 2px;
  color: var(--control-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
