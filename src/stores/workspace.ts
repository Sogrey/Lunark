import { defineStore } from "pinia";
import { ref } from "vue";
import type { TreeNode } from "@/lib/fs/workspaceIo";

export type SidebarPanel = "files" | "outline";

export const useWorkspaceStore = defineStore("workspace", () => {
  const rootPath = ref<string | null>(null);
  const rootName = ref<string | null>(null);
  const tree = ref<TreeNode[]>([]);
  const treeLoading = ref(false);
  const sidebarVisible = ref(true);
  const sidebarPanel = ref<SidebarPanel>("files");
  const expandedPaths = ref<Set<string>>(new Set());

  function toggleSidebar() {
    sidebarVisible.value = !sidebarVisible.value;
  }

  function setSidebarPanel(panel: SidebarPanel) {
    sidebarPanel.value = panel;
    sidebarVisible.value = true;
  }

  function applySidebarPrefs(visible: boolean, panel: SidebarPanel) {
    sidebarPanel.value = panel;
    sidebarVisible.value = visible;
  }

  function setWorkspace(path: string, name: string, nodes: TreeNode[]) {
    rootPath.value = path;
    rootName.value = name;
    tree.value = nodes;
    const expanded = new Set<string>();
    for (const node of nodes) {
      if (node.kind === "dir") expanded.add(node.path);
    }
    expandedPaths.value = expanded;
  }

  function clearWorkspace() {
    rootPath.value = null;
    rootName.value = null;
    tree.value = [];
    expandedPaths.value = new Set();
  }

  function toggleExpanded(path: string) {
    const next = new Set(expandedPaths.value);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    expandedPaths.value = next;
  }

  function isExpanded(path: string): boolean {
    return expandedPaths.value.has(path);
  }

  return {
    rootPath,
    rootName,
    tree,
    treeLoading,
    sidebarVisible,
    sidebarPanel,
    expandedPaths,
    toggleSidebar,
    setSidebarPanel,
    applySidebarPrefs,
    setWorkspace,
    clearWorkspace,
    toggleExpanded,
    isExpanded,
  };
});
