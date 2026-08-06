<script setup lang="ts">
import Toolbar from "./Toolbar.vue";
import Sidebar from "./Sidebar.vue";
import TabBar from "@/components/editor/TabBar.vue";
import SplitEditor from "@/components/editor/SplitEditor.vue";
import { useWorkspaceStore } from "@/stores/workspace";

const workspace = useWorkspaceStore();
</script>

<template>
  <div class="app-shell">
    <Toolbar />
    <div class="body">
      <Sidebar v-if="workspace.sidebarVisible" />
      <main class="main">
        <TabBar />
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
