<script setup lang="ts">
defineOptions({ name: "FileTreeNode" });

import type { TreeNode } from "@/lib/fs/workspaceIo";
import { useWorkspaceStore } from "@/stores/workspace";
import { useTabsStore } from "@/stores/tabs";

const props = defineProps<{
  node: TreeNode;
  depth: number;
}>();

const emit = defineEmits<{
  openFile: [path: string];
}>();

const workspace = useWorkspaceStore();
const tabs = useTabsStore();

function onClick() {
  if (props.node.kind === "dir") {
    workspace.toggleExpanded(props.node.path);
  } else {
    emit("openFile", props.node.path);
  }
}

function isActiveFile(): boolean {
  return (
    props.node.kind === "file" && tabs.activeTab.path === props.node.path
  );
}
</script>

<template>
  <div class="tree-node">
    <button
      type="button"
      class="row"
      :class="{
        active: isActiveFile(),
        dir: node.kind === 'dir',
      }"
      :style="{ paddingLeft: `${8 + depth * 12}px` }"
      @click="onClick"
    >
      <span v-if="node.kind === 'dir'" class="chevron">
        {{ workspace.isExpanded(node.path) ? "▾" : "▸" }}
      </span>
      <span v-else class="chevron file">·</span>
      <span class="label">{{ node.name }}</span>
    </button>

    <template v-if="node.kind === 'dir' && workspace.isExpanded(node.path)">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        @open-file="emit('openFile', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--text-color);
  text-align: left;
  padding: 5px 8px;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  line-height: 1.3;
}

.row:hover {
  background: rgba(112, 113, 125, 0.35);
  color: var(--item-hover-text-color);
}

.row.active {
  background: var(--active-file-bg-color);
  color: var(--active-file-text-color);
}

.chevron {
  width: 12px;
  flex-shrink: 0;
  font-size: 10px;
  color: var(--control-text-color);
}

.chevron.file {
  opacity: 0.5;
}

.label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
