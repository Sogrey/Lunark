<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "@tauri-apps/api/core";
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { useDocumentActions } from "@/composables/useDocumentActions";
import { collectMarkdownPaths } from "@/lib/fs/workspaceSearch";
import {
  buildBacklinks,
  type BacklinkEntry,
} from "@/lib/markdown/wikiLinks";
import { grantUserPath } from "@/lib/fs/scope";
import { fileBasename } from "@/lib/fs/documentIo";

const { t } = useI18n();
const editor = useEditorStore();
const workspace = useWorkspaceStore();
const { openPathInTab } = useDocumentActions();

const loading = ref(false);
const entries = ref<BacklinkEntry[]>([]);

async function refresh() {
  if (!isTauri() || !workspace.rootPath || !editor.filePath) {
    entries.value = [];
    return;
  }
  loading.value = true;
  try {
    const paths = collectMarkdownPaths(workspace.tree).slice(0, 80);
    const files: { path: string; name: string; text: string }[] = [];
    for (const path of paths) {
      try {
        await grantUserPath(path);
        const text = await readTextFile(path);
        files.push({ path, name: fileBasename(path), text });
      } catch {
        /* skip */
      }
    }
    entries.value = buildBacklinks(editor.filePath, files);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void refresh());
watch(
  () => [editor.filePath, workspace.rootPath, workspace.tree] as const,
  () => void refresh(),
);
</script>

<template>
  <div class="backlinks">
    <p v-if="!workspace.rootPath" class="hint">{{ t("shell.noWorkspace") }}</p>
    <p v-else-if="!editor.filePath" class="hint">{{ t("shell.backlinksNeedFile") }}</p>
    <p v-else-if="loading" class="hint">{{ t("shell.scanning") }}</p>
    <p v-else-if="entries.length === 0" class="hint">{{ t("shell.backlinksEmpty") }}</p>
    <ul v-else class="list">
      <li v-for="e in entries" :key="e.path">
        <button type="button" class="link" @click="openPathInTab(e.path)">
          {{ e.name }}
          <span class="count">{{ e.count }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.backlinks {
  padding: 8px 10px;
  font-size: 13px;
}
.hint {
  color: var(--control-text-color, #8b9198);
  margin: 8px 0;
  line-height: 1.45;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.link {
  display: flex;
  justify-content: space-between;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--text-color, #b8bfc6);
  text-align: left;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.link:hover {
  background: var(--item-hover-bg-color, rgba(112, 113, 125, 0.25));
}
.count {
  color: var(--control-text-color, #8b9198);
  font-size: 12px;
}
</style>
