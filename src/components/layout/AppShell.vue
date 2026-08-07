<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import Toolbar from "./Toolbar.vue";
import Sidebar from "./Sidebar.vue";
import TabBar from "@/components/editor/TabBar.vue";
import SearchBar from "@/components/editor/SearchBar.vue";
import SplitEditor from "@/components/editor/SplitEditor.vue";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  notifyPrefsRestored,
  usePrefsPersistence,
} from "@/lib/prefs/persistence";
import { useWindowLifecycle } from "@/composables/useWindowLifecycle";
import { useExternalFileWatch } from "@/composables/useExternalFileWatch";
import { setupAppMenu } from "@/lib/appMenu";

const workspace = useWorkspaceStore();
const prefs = usePrefsPersistence();
const windowLife = useWindowLifecycle();
useExternalFileWatch();

onMounted(() => {
  void (async () => {
    const { restoredWorkspace, window: geo } = await prefs.hydrate();
    await windowLife.bind({
      geometry: geo ?? undefined,
      onGeometry: (g) => prefs.setWindowGeometry(g),
    });
    await setupAppMenu();
    if (restoredWorkspace) notifyPrefsRestored(true);
  })();
});

onBeforeUnmount(() => {
  windowLife.dispose();
  prefs.dispose();
});
</script>

<template>
  <div class="app-shell">
    <Toolbar />
    <div class="body">
      <Sidebar v-if="workspace.sidebarVisible" />
      <main class="main">
        <TabBar />
        <SearchBar />
        <div class="editor-area">
          <SplitEditor />
        </div>
      </main>
    </div>
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
</style>
