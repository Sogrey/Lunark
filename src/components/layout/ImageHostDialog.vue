<script setup lang="ts">
/**
 * 集中图床管理：启用开关、多配置、当前选用。
 */
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { useEditorStore } from "@/stores/editor";
import { DEFAULT_PICGO_ENDPOINT } from "@/lib/fs/picgo";
import {
  newImageHostId,
  type ImageHostKind,
  type ImageHostProfile,
} from "@/lib/fs/imageHosts";

const { t } = useI18n();
const editor = useEditorStore();
const open = ref(false);

const enabled = ref(false);
const hosts = ref<ImageHostProfile[]>([]);
const activeId = ref("");

const activeHost = computed(
  () => hosts.value.find((h) => h.id === activeId.value) ?? hosts.value[0],
);

function cloneFromStore() {
  enabled.value = editor.picgoEnabled;
  hosts.value = editor.imageHosts.map((h) => ({ ...h }));
  activeId.value =
    editor.activeImageHostId || hosts.value[0]?.id || "";
}

function show() {
  cloneFromStore();
  open.value = true;
}

function close() {
  open.value = false;
}

function addHost() {
  const id = newImageHostId();
  hosts.value.push({
    id,
    name: t("imageHost.newName"),
    kind: "custom",
    endpoint: DEFAULT_PICGO_ENDPOINT,
  });
  activeId.value = id;
}

function removeActive() {
  if (hosts.value.length <= 1) {
    ElMessage.info(t("imageHost.keepOne"));
    return;
  }
  const id = activeId.value;
  hosts.value = hosts.value.filter((h) => h.id !== id);
  activeId.value = hosts.value[0]!.id;
}

function setKind(kind: ImageHostKind) {
  const h = activeHost.value;
  if (!h) return;
  h.kind = kind;
  if (kind === "picgo" && !h.endpoint.trim()) {
    h.endpoint = DEFAULT_PICGO_ENDPOINT;
  }
}

function save() {
  const cleaned = hosts.value
    .map((h) => ({
      ...h,
      name: h.name.trim() || "Host",
      endpoint: h.endpoint.trim() || DEFAULT_PICGO_ENDPOINT,
    }))
    .filter((h) => h.id);
  if (cleaned.length === 0) {
    ElMessage.warning(t("imageHost.keepOne"));
    return;
  }
  const aid =
    cleaned.find((h) => h.id === activeId.value)?.id ?? cleaned[0]!.id;
  editor.setImageHosts(cleaned);
  editor.setActiveImageHostId(aid);
  editor.setPicgoEnabled(enabled.value);
  const host = cleaned.find((h) => h.id === aid);
  if (host) editor.setPicgoEndpoint(host.endpoint);
  ElMessage.success(t("imageHost.saved"));
  close();
}

async function testActive() {
  const h = activeHost.value;
  if (!h) return;
  try {
    const resp = await fetch(h.endpoint.trim() || DEFAULT_PICGO_ENDPOINT, {
      method: "OPTIONS",
    });
    // 多数 PicGo 不支持 OPTIONS；再试空 GET / 看能否连通
    if (resp.ok || resp.status === 404 || resp.status === 405) {
      ElMessage.success(t("imageHost.testOk"));
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    const base = (h.endpoint.trim() || DEFAULT_PICGO_ENDPOINT).replace(
      /\/upload\/?$/i,
      "",
    );
    const resp = await fetch(base || h.endpoint, { method: "GET" });
    if (resp.ok || resp.status === 404) {
      ElMessage.success(t("imageHost.testOk"));
      return;
    }
    ElMessage.warning(t("imageHost.testFail", { code: String(resp.status) }));
  } catch (e) {
    ElMessage.error(
      e instanceof Error ? e.message : t("imageHost.testFail", { code: "?" }),
    );
  }
}

function onEvent() {
  show();
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && open.value) {
    e.stopPropagation();
    close();
  }
}

watch(
  () => editor.picgoEnabled,
  () => {
    if (open.value) enabled.value = editor.picgoEnabled;
  },
);

onMounted(() => {
  window.addEventListener("lunark:image-hosts", onEvent);
  window.addEventListener("keydown", onKey, true);
});
onUnmounted(() => {
  window.removeEventListener("lunark:image-hosts", onEvent);
  window.removeEventListener("keydown", onKey, true);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="mask" @click.self="close">
      <div
        class="dialog"
        role="dialog"
        :aria-label="t('imageHost.title')"
      >
        <header class="head">
          <h2>{{ t("imageHost.title") }}</h2>
          <button type="button" class="close" @click="close">×</button>
        </header>
        <div class="body">
          <label class="row check">
            <input v-model="enabled" type="checkbox" />
            <span>{{ t("imageHost.enable") }}</span>
          </label>
          <p class="hint">{{ t("imageHost.hint") }}</p>

          <div class="split">
            <div class="list">
              <button
                v-for="h in hosts"
                :key="h.id"
                type="button"
                class="host"
                :class="{ active: h.id === activeId }"
                @click="activeId = h.id"
              >
                {{ h.name }}
              </button>
              <button type="button" class="add" @click="addHost">
                + {{ t("imageHost.add") }}
              </button>
            </div>
            <div v-if="activeHost" class="form">
              <label>
                <span>{{ t("imageHost.name") }}</span>
                <input v-model="activeHost.name" type="text" />
              </label>
              <label>
                <span>{{ t("imageHost.kind") }}</span>
                <select
                  :value="activeHost.kind"
                  @change="
                    setKind(
                      ($event.target as HTMLSelectElement).value as ImageHostKind,
                    )
                  "
                >
                  <option value="picgo">PicGo</option>
                  <option value="custom">{{ t("imageHost.kindCustom") }}</option>
                </select>
              </label>
              <label>
                <span>{{ t("imageHost.endpoint") }}</span>
                <input
                  v-model="activeHost.endpoint"
                  type="url"
                  spellcheck="false"
                  :placeholder="DEFAULT_PICGO_ENDPOINT"
                />
              </label>
              <div class="actions">
                <button type="button" class="btn" @click="testActive">
                  {{ t("imageHost.test") }}
                </button>
                <button type="button" class="btn danger" @click="removeActive">
                  {{ t("imageHost.remove") }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <footer class="foot">
          <button type="button" class="btn" @click="close">
            {{ t("imageHost.cancel") }}
          </button>
          <button type="button" class="btn primary" @click="save">
            {{ t("imageHost.save") }}
          </button>
        </footer>
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
  width: min(560px, 100%);
  max-height: min(80vh, 640px);
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
.body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px 14px;
}
.row.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}
.hint {
  margin: 8px 0 14px;
  font-size: 12px;
  color: var(--control-text-color, #8b9198);
  line-height: 1.45;
}
.split {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px;
  min-height: 200px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-right: 1px solid var(--border-color, #474d54);
  padding-right: 10px;
}
.host,
.add {
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.host:hover,
.add:hover {
  background: rgba(112, 113, 125, 0.28);
}
.host.active {
  background: rgba(112, 113, 125, 0.4);
  color: var(--text-color, #e8ecf0);
}
.add {
  color: var(--primary-color, #a3d5fe);
  margin-top: 4px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--control-text-color, #8b9198);
}
.form input,
.form select {
  border: 1px solid var(--border-color, #474d54);
  background: #25292e;
  color: var(--text-color, #e8ecf0);
  border-radius: 6px;
  padding: 7px 9px;
  font-size: 13px;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border-color, #474d54);
}
.btn {
  border: 1px solid var(--border-color, #474d54);
  background: transparent;
  color: inherit;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}
.btn:hover {
  background: rgba(112, 113, 125, 0.28);
}
.btn.primary {
  background: var(--primary-color, #5b9bd5);
  border-color: transparent;
  color: #1a1d21;
}
.btn.danger {
  color: #f07178;
}
</style>
