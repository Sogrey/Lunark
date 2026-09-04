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
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  notifyPrefsRestored,
  usePrefsPersistence,
} from "@/lib/prefs/persistence";
import { loadPrefs } from "@/lib/prefs/store";
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

const shellClass = computed(() => ({
  "focus-mode": editor.focusMode,
  "typewriter-mode": editor.typewriterMode,
}));

onMounted(() => {
  void (async () => {
    const initialPrefs = await loadPrefs();
    // 尺寸已在 main.ts bootstrap 中恢复；此处不再二次 setSize，避免加载 Tab 时跳动
    await windowLife.bind({
      geometry: initialPrefs.window ?? undefined,
      skipInitialPlacement: true,
      onGeometry: (g) => prefs.setWindowGeometry(g),
      onFlushSave: (geo) => prefs.flushSave(geo),
    });

    const { restoredWorkspace, restoredTabs } =
      await prefs.hydrate(initialPrefs);
    await setupAppMenu();
    notifyPrefsRestored(restoredWorkspace, restoredTabs);
  })();
});

onBeforeUnmount(() => {
  windowLife.dispose();
  prefs.dispose();
});
</script>

<template>
  <div class="app-shell" :class="shellClass">
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
