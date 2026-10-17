<script setup lang="ts">
/**
 * 快照列表 + Git 时间线（只读浏览 / 恢复）。
 */
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { ask } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "@/stores/editor";
import {
  listSnapshots,
  readSnapshot,
  type SnapshotMeta,
} from "@/lib/fs/snapshots";
import {
  fetchGitFileAtCommit,
  fetchGitFileLog,
  type GitCommitEntry,
} from "@/lib/fs/gitHistory";

type Tab = "snapshots" | "git";

const { t } = useI18n();
const editor = useEditorStore();
const open = ref(false);
const tab = ref<Tab>("snapshots");
const loading = ref(false);
const snapshots = ref<SnapshotMeta[]>([]);
const commits = ref<GitCommitEntry[]>([]);
const gitError = ref("");

const title = computed(() =>
  tab.value === "git" ? t("history.gitTitle") : t("history.snapshotTitle"),
);

async function load() {
  const path = editor.filePath;
  if (!path) {
    snapshots.value = [];
    commits.value = [];
    return;
  }
  loading.value = true;
  gitError.value = "";
  try {
    snapshots.value = await listSnapshots(path);
    try {
      commits.value = await fetchGitFileLog(path);
    } catch (e) {
      commits.value = [];
      gitError.value = e instanceof Error ? e.message : String(e);
    }
  } finally {
    loading.value = false;
  }
}

function show(preferred: Tab = "snapshots") {
  tab.value = preferred;
  open.value = true;
  void load();
}

function close() {
  open.value = false;
}

async function restoreSnapshot(id: string, at: number) {
  const path = editor.filePath;
  if (!path) return;
  const when = new Date(at).toLocaleString();
  const ok = await ask(t("msg.snapshotRestoreAsk", { when }), {
    title: t("menu.restoreSnapshot"),
    kind: "warning",
  });
  if (!ok) return;
  try {
    const text = await readSnapshot(path, id);
    editor.setContent(text);
    ElMessage.success(t("msg.snapshotRestored"));
    close();
  } catch (e) {
    ElMessage.error(
      e instanceof Error ? e.message : t("msg.snapshotRestoreFail"),
    );
  }
}

async function openGitCommit(c: GitCommitEntry) {
  const path = editor.filePath;
  if (!path) return;
  const when = new Date(c.at * 1000).toLocaleString();
  const ok = await ask(t("msg.gitRestoreAsk", { when, subject: c.subject }), {
    title: t("history.gitTitle"),
    kind: "warning",
  });
  if (!ok) return;
  try {
    const text = await fetchGitFileAtCommit(path, c.hash);
    editor.setContent(text);
    ElMessage.success(t("msg.gitRestored"));
    close();
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : t("msg.gitRestoreFail"));
  }
}

function onEvent(e: Event) {
  const detail = (e as CustomEvent).detail as Tab | undefined;
  show(detail === "git" ? "git" : "snapshots");
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && open.value) {
    e.stopPropagation();
    close();
  }
}

watch(
  () => editor.filePath,
  () => {
    if (open.value) void load();
  },
);

onMounted(() => {
  window.addEventListener("lunark:history", onEvent);
  window.addEventListener("keydown", onKey, true);
});
onUnmounted(() => {
  window.removeEventListener("lunark:history", onEvent);
  window.removeEventListener("keydown", onKey, true);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="mask" @click.self="close">
      <div class="dialog" role="dialog" :aria-label="title">
        <header class="head">
          <h2>{{ title }}</h2>
          <button type="button" class="close" @click="close">×</button>
        </header>
        <div class="tabs">
          <button
            type="button"
            :class="{ active: tab === 'snapshots' }"
            @click="tab = 'snapshots'"
          >
            {{ t("history.tabSnapshots") }}
          </button>
          <button
            type="button"
            :class="{ active: tab === 'git' }"
            @click="tab = 'git'"
          >
            {{ t("history.tabGit") }}
          </button>
        </div>
        <div class="body">
          <p v-if="!editor.filePath" class="hint">{{ t("msg.snapshotNeedFile") }}</p>
          <p v-else-if="loading" class="hint">{{ t("shell.scanning") }}</p>
          <template v-else-if="tab === 'snapshots'">
            <p v-if="snapshots.length === 0" class="hint">{{ t("msg.snapshotEmpty") }}</p>
            <ul v-else class="list">
              <li v-for="s in snapshots" :key="s.id">
                <button type="button" class="row" @click="restoreSnapshot(s.id, s.at)">
                  <span class="when">{{ new Date(s.at).toLocaleString() }}</span>
                  <span class="meta">{{ s.label }}</span>
                </button>
              </li>
            </ul>
          </template>
          <template v-else>
            <p v-if="gitError" class="hint">{{ gitError }}</p>
            <p v-else-if="commits.length === 0" class="hint">{{ t("history.gitEmpty") }}</p>
            <ul v-else class="list">
              <li v-for="c in commits" :key="c.hash">
                <button type="button" class="row" @click="openGitCommit(c)">
                  <span class="when">
                    <code>{{ c.shortHash }}</code>
                    {{ new Date(c.at * 1000).toLocaleString() }}
                  </span>
                  <span class="meta">{{ c.subject }} · {{ c.author }}</span>
                </button>
              </li>
            </ul>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 12000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.dialog {
  width: min(520px, 100%);
  max-height: min(70vh, 560px);
  display: flex;
  flex-direction: column;
  background: #2e3238;
  border: 1px solid var(--border-color, #474d54);
  border-radius: 10px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  color: var(--text-color, #b8bfc6);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color, #474d54);
}
.head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.close {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
}
.tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px 0;
}
.tabs button {
  border: 0;
  background: transparent;
  color: var(--control-text-color, #8b9198);
  padding: 6px 10px;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  font-size: 13px;
}
.tabs button.active {
  color: var(--text-color, #e8ecf0);
  background: rgba(112, 113, 125, 0.25);
}
.body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 12px 14px;
}
.hint {
  margin: 12px 4px;
  color: var(--control-text-color, #8b9198);
  font-size: 13px;
  line-height: 1.45;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 2px;
}
.row:hover {
  background: rgba(112, 113, 125, 0.3);
}
.when {
  font-size: 13px;
}
.when code {
  margin-right: 6px;
  color: var(--primary-color, #a3d5fe);
  font-size: 12px;
}
.meta {
  font-size: 12px;
  color: var(--control-text-color, #8b9198);
}
</style>
