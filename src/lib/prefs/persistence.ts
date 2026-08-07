import { watch, type WatchStopHandle } from "vue";
import { exists } from "@tauri-apps/plugin-fs";
import { isTauri } from "@tauri-apps/api/core";
import { ElMessage } from "element-plus";
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  loadPrefs,
  savePrefs,
  type AppPrefs,
  type WindowGeometry,
} from "@/lib/prefs/store";
import {
  buildMarkdownTree,
  folderDisplayName,
} from "@/lib/fs/workspaceIo";

function collectPrefs(
  editor: ReturnType<typeof useEditorStore>,
  workspace: ReturnType<typeof useWorkspaceStore>,
  windowGeo: WindowGeometry | null,
): AppPrefs {
  return {
    splitRatio: editor.splitRatio,
    viewMode: editor.viewMode,
    sidebarVisible: workspace.sidebarVisible,
    sidebarPanel: workspace.sidebarPanel,
    scrollSyncEnabled: editor.scrollSyncEnabled,
    lastWorkspacePath: workspace.rootPath,
    window: windowGeo,
  };
}

/**
 * 启动时恢复偏好；变更时防抖写入 plugin-store。
 */
export function usePrefsPersistence() {
  const editor = useEditorStore();
  const workspace = useWorkspaceStore();

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let stopWatch: WatchStopHandle | null = null;
  let ready = false;
  let windowGeo: WindowGeometry | null = null;

  function scheduleSave() {
    if (!ready) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void savePrefs(collectPrefs(editor, workspace, windowGeo));
    }, 400);
  }

  function setWindowGeometry(geo: WindowGeometry) {
    windowGeo = geo;
    scheduleSave();
  }

  async function restoreLastWorkspace(path: string) {
    if (!isTauri()) return;
    try {
      if (!(await exists(path))) return;
      workspace.treeLoading = true;
      const tree = await buildMarkdownTree(path);
      workspace.setWorkspace(path, folderDisplayName(path), tree);
    } catch (e) {
      console.warn("[lunark] restore workspace failed", e);
    } finally {
      workspace.treeLoading = false;
    }
  }

  async function hydrate(): Promise<{
    restoredWorkspace: boolean;
    window: WindowGeometry | null;
  }> {
    const prefs = await loadPrefs();
    editor.setSplitRatio(prefs.splitRatio);
    editor.setViewMode(prefs.viewMode);
    editor.setScrollSyncEnabled(prefs.scrollSyncEnabled);
    workspace.applySidebarPrefs(prefs.sidebarVisible, prefs.sidebarPanel);
    windowGeo = prefs.window;

    let restoredWorkspace = false;
    if (prefs.lastWorkspacePath) {
      await restoreLastWorkspace(prefs.lastWorkspacePath);
      restoredWorkspace = !!workspace.rootPath;
    }

    ready = true;

    stopWatch = watch(
      () =>
        [
          editor.splitRatio,
          editor.viewMode,
          editor.scrollSyncEnabled,
          workspace.sidebarVisible,
          workspace.sidebarPanel,
          workspace.rootPath,
        ] as const,
      () => scheduleSave(),
    );

    return { restoredWorkspace, window: prefs.window };
  }

  function dispose() {
    if (saveTimer) clearTimeout(saveTimer);
    stopWatch?.();
    if (ready) {
      void savePrefs(collectPrefs(editor, workspace, windowGeo));
    }
  }

  return { hydrate, dispose, setWindowGeometry };
}

/** 打开工作区后立即记住路径（不依赖防抖） */
export async function persistWorkspacePath(path: string | null) {
  const editor = useEditorStore();
  const workspace = useWorkspaceStore();
  const prefs = await loadPrefs();
  await savePrefs({
    ...collectPrefs(editor, workspace, prefs.window),
    lastWorkspacePath: path,
  });
}

export function notifyPrefsRestored(hadWorkspace: boolean) {
  if (hadWorkspace) {
    ElMessage.success("已恢复上次工作区");
  }
}
