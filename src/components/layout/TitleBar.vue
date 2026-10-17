<script setup lang="ts">
/**
 * 无系统边框时的自绘标题栏：拖拽区 + 最小化 / 最大化 / 关闭。
 */
import { computed, onMounted, onUnmounted, ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { useI18n } from "vue-i18n";
import { useEditorStore } from "@/stores/editor";

const { t } = useI18n();
const editor = useEditorStore();
const maximized = ref(false);
let unlistenResize: (() => void) | null = null;

const title = computed(() => editor.windowTitle);

async function syncMaximized() {
  if (!isTauri()) return;
  try {
    maximized.value = await getCurrentWindow().isMaximized();
  } catch {
    maximized.value = false;
  }
}

async function onDblClick() {
  if (!isTauri()) return;
  try {
    await getCurrentWindow().toggleMaximize();
    await syncMaximized();
  } catch {
    /* ignore */
  }
}

async function minimize() {
  if (!isTauri()) return;
  try {
    await getCurrentWindow().minimize();
  } catch {
    /* ignore */
  }
}

async function toggleMax() {
  if (!isTauri()) return;
  try {
    await getCurrentWindow().toggleMaximize();
    await syncMaximized();
  } catch {
    /* ignore */
  }
}

async function closeWin() {
  if (!isTauri()) return;
  try {
    // 走 closeRequested，以便未保存拦截
    await getCurrentWindow().close();
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  void syncMaximized();
  if (!isTauri()) return;
  void getCurrentWindow()
    .onResized(() => {
      void syncMaximized();
    })
    .then((fn) => {
      unlistenResize = fn;
    });
});

onUnmounted(() => {
  unlistenResize?.();
});
</script>

<template>
  <header class="titlebar" data-tauri-drag-region @dblclick="onDblClick">
    <div class="brand" data-tauri-drag-region>
      <span class="logo" aria-hidden="true">☽</span>
      <span class="title" :title="title">{{ title }}</span>
    </div>
    <div class="controls">
      <button
        type="button"
        class="ctrl"
        :aria-label="t('titlebar.minimize')"
        :title="t('titlebar.minimize')"
        @click="minimize"
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M2 6h8" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </button>
      <button
        type="button"
        class="ctrl"
        :aria-label="
          maximized ? t('titlebar.restore') : t('titlebar.maximize')
        "
        :title="maximized ? t('titlebar.restore') : t('titlebar.maximize')"
        @click="toggleMax"
      >
        <svg
          v-if="!maximized"
          viewBox="0 0 12 12"
          width="12"
          height="12"
          aria-hidden="true"
        >
          <rect
            x="2"
            y="2"
            width="8"
            height="8"
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
          />
        </svg>
        <svg v-else viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path
            d="M3.5 4.5h5v5h-5zM4.5 3.5h5v5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
          />
        </svg>
      </button>
      <button
        type="button"
        class="ctrl close"
        :aria-label="t('titlebar.close')"
        :title="t('titlebar.close')"
        @click="closeWin"
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path
            d="M3 3l6 6M9 3L3 9"
            stroke="currentColor"
            stroke-width="1.2"
          />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.titlebar {
  flex-shrink: 0;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 0 12px;
  background: color-mix(in srgb, var(--bg-color, #363b40) 92%, transparent);
  border-bottom: 1px solid var(--border-color, #474d54);
  user-select: none;
  -webkit-app-region: drag;
}

:global(:root[data-window-material="mica"]) .titlebar,
:global(:root[data-window-material="acrylic"]) .titlebar {
  background: transparent;
  border-bottom-color: color-mix(
    in srgb,
    var(--border-color, #474d54) 55%,
    transparent
  );
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
  -webkit-app-region: drag;
}

.logo {
  flex-shrink: 0;
  opacity: 0.75;
  font-size: 14px;
  line-height: 1;
}

.title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-color, #b8bfc6);
  opacity: 0.9;
}

.controls {
  display: flex;
  align-items: stretch;
  height: 100%;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.ctrl {
  width: 46px;
  height: 100%;
  border: 0;
  background: transparent;
  color: var(--control-text-color, #8b9198);
  cursor: default;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.ctrl:hover {
  background: rgba(127, 127, 127, 0.22);
  color: var(--text-color, #e8ecf0);
}

.ctrl.close:hover {
  background: #e81123;
  color: #fff;
}
</style>
