<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import Sidebar from "./Sidebar.vue";
import StatusBar from "./StatusBar.vue";
import TabBar from "@/components/editor/TabBar.vue";
import SearchBar from "@/components/editor/SearchBar.vue";
import EditorWorkspace from "@/components/editor/EditorWorkspace.vue";
import EditorContextMenu from "@/components/editor/EditorContextMenu.vue";
import TableToolbar from "@/components/editor/TableToolbar.vue";
import HelpDialog from "@/components/layout/HelpDialog.vue";
import HistoryDialog from "@/components/layout/HistoryDialog.vue";
import ImageHostDialog from "@/components/layout/ImageHostDialog.vue";
import TitleBar from "@/components/layout/TitleBar.vue";
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { isTauri } from "@tauri-apps/api/core";
import {
  notifyPrefsRestored,
  usePrefsPersistence,
} from "@/lib/prefs/persistence";
import { loadPrefs } from "@/lib/prefs/store";
import { showMainWindow } from "@/lib/window/bootstrapGeometry";
import { useWindowLifecycle } from "@/composables/useWindowLifecycle";
import { useExternalFileWatch } from "@/composables/useExternalFileWatch";
import { useMenuBridge } from "@/composables/useMenuBridge";
import { setupAppMenu } from "@/lib/appMenu";

const workspace = useWorkspaceStore();
const editor = useEditorStore();
const prefs = usePrefsPersistence();
const windowLife = useWindowLifecycle();
useExternalFileWatch();
useMenuBridge();

const showTitlebar = computed(
  () => isTauri() && editor.customTitlebar,
);

const shellClass = computed(() => ({
  "focus-mode": editor.focusMode,
  "typewriter-mode": editor.typewriterMode,
  "has-titlebar": showTitlebar.value,
}));

onMounted(() => {
  void (async () => {
    let restoredWorkspace = false;
    let restoredTabs = 0;
    try {
      const initialPrefs = await loadPrefs();
      // 尺寸已在 Rust setup + main.ts bootstrap 中恢复；此处不再二次 setSize
      await windowLife.bind({
        geometry: initialPrefs.window ?? undefined,
        skipInitialPlacement: true,
        onGeometry: (g) => prefs.setWindowGeometry(g),
        onFlushSave: (geo) => prefs.flushSave(geo),
      });

      const restored = await prefs.hydrate(initialPrefs);
      restoredWorkspace = restored.restoredWorkspace;
      restoredTabs = restored.restoredTabs;
      await setupAppMenu();
    } catch (e) {
      console.warn("[lunark] AppShell bootstrap failed", e);
    } finally {
      // 标题栏/材质应用后再 show，避免先露默认小窗再变大
      await showMainWindow();
    }
    if (restoredTabs > 0) {
      notifyPrefsRestored(restoredWorkspace, restoredTabs);
    }
  })();
});

onBeforeUnmount(() => {
  windowLife.dispose();
  prefs.dispose();
});
</script>

<template>
  <div class="app-shell" :class="shellClass">
    <TitleBar v-if="showTitlebar" />
    <div class="body">
      <Sidebar v-if="workspace.sidebarVisible && !editor.focusMode" />
      <main class="main">
        <TabBar v-if="!editor.focusMode" />
        <SearchBar v-if="editor.searchOpen" />
        <div class="editor-area">
          <EditorWorkspace />
        </div>
        <StatusBar v-if="editor.statusBarVisible" />
      </main>
    </div>
    <EditorContextMenu />
    <TableToolbar />
    <HelpDialog />
    <HistoryDialog />
    <ImageHostDialog />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color);
}

.body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.editor-area {
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.app-shell.focus-mode .editor-area {
  display: flex;
  justify-content: center;
}

.app-shell.focus-mode .editor-area :deep(.hybrid-editor),
.app-shell.focus-mode .editor-area :deep(.source-editor),
.app-shell.focus-mode .editor-area :deep(.split-editor) {
  max-width: 52rem;
  width: 100%;
  margin: 0 auto;
}
</style>
