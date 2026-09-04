import { watch, type WatchStopHandle } from "vue";
import { exists } from "@tauri-apps/plugin-fs";
import { isTauri } from "@tauri-apps/api/core";
import { ElMessage } from "element-plus";
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { useTabsStore } from "@/stores/tabs";
import { useThemeStore } from "@/stores/theme";
import {
  MAX_SESSION_TABS,
  useSessionStore,
} from "@/stores/session";
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
import { fileBasename, readMarkdownFile } from "@/lib/fs/documentIo";
import { rememberDiskMtime } from "@/composables/useExternalFileWatch";
import { refreshAppMenu } from "@/lib/appMenu";
import { getLocale, setLocale, t, type LocaleId } from "@/lib/i18n";

function collectSessionPaths(tabs: ReturnType<typeof useTabsStore>): {
  paths: string[];
  activePath: string | null;
} {
  const paths: string[] = [];
  for (const tab of tabs.tabs) {
    if (tab.path) paths.push(tab.path);
    if (paths.length >= MAX_SESSION_TABS) break;
  }
  const active = tabs.activeTab.path;
  return { paths, activePath: active };
}

function collectPrefs(
  editor: ReturnType<typeof useEditorStore>,
  workspace: ReturnType<typeof useWorkspaceStore>,
  tabs: ReturnType<typeof useTabsStore>,
  session: ReturnType<typeof useSessionStore>,
  theme: ReturnType<typeof useThemeStore>,
  windowGeo: WindowGeometry | null,
): AppPrefs {
  const { paths, activePath } = collectSessionPaths(tabs);
  return {
    splitRatio: editor.splitRatio,
    viewMode: editor.viewMode,
    sidebarVisible: workspace.sidebarVisible,
    sidebarPanel: workspace.sidebarPanel,
    scrollSyncEnabled: editor.scrollSyncEnabled,
    focusMode: editor.focusMode,
    typewriterMode: editor.typewriterMode,
    statusBarVisible: editor.statusBarVisible,
    themeId: theme.themeId,
    locale: getLocale(),
    lastWorkspacePath: workspace.rootPath,
    sessionTabPaths: paths,
    sessionActivePath: activePath,
    welcomeSeenVersion: tabs.welcomeSeenVersion,
    recentFiles: session.recentFiles.map((r) => ({ ...r })),
    window: windowGeo,
  };
}

async function restoreSessionTabs(
  paths: string[],
  activePath: string | null,
): Promise<number> {
  if (!isTauri() || paths.length === 0) return 0;
  const tabs = useTabsStore();
  let opened = 0;

  for (const path of paths) {
    try {
      if (!(await exists(path))) continue;
      const text = await readMarkdownFile(path);
      tabs.openOrFocus(path, fileBasename(path), text);
      await rememberDiskMtime(path);
      opened += 1;
    } catch (e) {
      console.warn("[lunark] restore tab failed", path, e);
    }
  }

  if (activePath) {
    const tab = tabs.tabs.find((t) => t.path === activePath);
    if (tab) tabs.activate(tab.id);
  }

  return opened;
}

/**
 * 启动时恢复偏好；变更时防抖写入 plugin-store。
 */
export function usePrefsPersistence() {
  const editor = useEditorStore();
  const workspace = useWorkspaceStore();
  const tabs = useTabsStore();
  const session = useSessionStore();
  const theme = useThemeStore();

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let stopWatch: WatchStopHandle | null = null;
  let ready = false;
  let windowGeo: WindowGeometry | null = null;
  /** hydrate 完成前改过窗口时，ready 后补一次落盘 */
  let windowDirtyBeforeReady = false;

  function scheduleSave() {
    if (!ready) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void savePrefs(
        collectPrefs(editor, workspace, tabs, session, theme, windowGeo),
      );
    }, 400);
  }

  function setWindowGeometry(geo: WindowGeometry) {
    windowGeo = geo;
    if (!ready) {
      windowDirtyBeforeReady = true;
      return;
    }
    scheduleSave();
  }

  /** 退出前立即落盘（含窗口几何） */
  async function flushSave(geo?: WindowGeometry | null) {
    if (geo) windowGeo = geo;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (!ready && !windowGeo) return;
    await savePrefs(
      collectPrefs(editor, workspace, tabs, session, theme, windowGeo),
    );
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

  async function hydrate(preloaded?: AppPrefs): Promise<{
    restoredWorkspace: boolean;
    restoredTabs: number;
    window: WindowGeometry | null;
  }> {
    const prefs = preloaded ?? (await loadPrefs());
    editor.setSplitRatio(prefs.splitRatio);
    editor.setViewMode(prefs.viewMode);
    editor.setScrollSyncEnabled(prefs.scrollSyncEnabled);
    editor.setFocusMode(prefs.focusMode);
    editor.setTypewriterMode(prefs.typewriterMode);
    editor.setStatusBarVisible(prefs.statusBarVisible);
    await theme.hydrate(prefs.themeId);
    setLocale(prefs.locale);
    workspace.applySidebarPrefs(prefs.sidebarVisible, prefs.sidebarPanel);
    session.setRecent(prefs.recentFiles);
    windowGeo = prefs.window;

    let restoredWorkspace = false;
    if (prefs.lastWorkspacePath) {
      await restoreLastWorkspace(prefs.lastWorkspacePath);
      restoredWorkspace = !!workspace.rootPath;
    }

    const restoredTabs = await restoreSessionTabs(
      prefs.sessionTabPaths,
      prefs.sessionActivePath,
    );

    tabs.applyWelcomePolicy(prefs.welcomeSeenVersion);

    ready = true;
    if (windowDirtyBeforeReady) {
      windowDirtyBeforeReady = false;
      scheduleSave();
    }

    stopWatch = watch(
      () =>
        [
          editor.splitRatio,
          editor.viewMode,
          editor.scrollSyncEnabled,
          editor.focusMode,
          editor.typewriterMode,
          editor.statusBarVisible,
          theme.themeId,
          workspace.sidebarVisible,
          workspace.sidebarPanel,
          workspace.rootPath,
          tabs.activeId,
          tabs.welcomeSeenVersion,
          tabs.tabs.map((t) => t.path).join("\0"),
          session.recentFiles.map((r) => r.path).join("\0"),
        ] as const,
      () => scheduleSave(),
    );

    return { restoredWorkspace, restoredTabs, window: prefs.window };
  }

  function dispose() {
    if (saveTimer) clearTimeout(saveTimer);
    stopWatch?.();
    if (ready) {
      void savePrefs(
        collectPrefs(editor, workspace, tabs, session, theme, windowGeo),
      );
    }
  }

  return { hydrate, dispose, setWindowGeometry, flushSave };
}

/** 打开工作区后立即记住路径（不依赖防抖） */
export async function persistWorkspacePath(path: string | null) {
  const editor = useEditorStore();
  const workspace = useWorkspaceStore();
  const tabs = useTabsStore();
  const session = useSessionStore();
  const theme = useThemeStore();
  const prefs = await loadPrefs();
  await savePrefs({
    ...collectPrefs(editor, workspace, tabs, session, theme, prefs.window),
    lastWorkspacePath: path,
  });
}

/** 最近文件变更后立刻落盘并刷新菜单 */
export async function persistRecentNow() {
  const editor = useEditorStore();
  const workspace = useWorkspaceStore();
  const tabs = useTabsStore();
  const session = useSessionStore();
  const theme = useThemeStore();
  const prefs = await loadPrefs();
  await savePrefs(
    collectPrefs(editor, workspace, tabs, session, theme, prefs.window),
  );
  await refreshAppMenu();
}

/** 切换语言并立刻持久化 + 重建原生菜单 */
export async function persistLocale(locale: LocaleId) {
  setLocale(locale);
  const editor = useEditorStore();
  const workspace = useWorkspaceStore();
  const tabs = useTabsStore();
  const session = useSessionStore();
  const theme = useThemeStore();
  const prefs = await loadPrefs();
  await savePrefs({
    ...collectPrefs(editor, workspace, tabs, session, theme, prefs.window),
    locale,
  });
  await refreshAppMenu();
}

export function notifyPrefsRestored(
  hadWorkspace: boolean,
  restoredTabs = 0,
) {
  if (restoredTabs > 0) {
    ElMessage.success(
      hadWorkspace
        ? t("msg.restoredWorkspaceTabs", { n: restoredTabs })
        : t("msg.restoredTabs", { n: restoredTabs }),
    );
  } else if (hadWorkspace) {
    ElMessage.success(t("msg.restoredWorkspace"));
  }
}
