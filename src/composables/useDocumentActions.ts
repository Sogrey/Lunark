import { ElMessage } from "element-plus";
import { useEditorStore } from "@/stores/editor";
import { useTabsStore, type DocTab } from "@/stores/tabs";
import { useWorkspaceStore } from "@/stores/workspace";
import { useSessionStore } from "@/stores/session";
import {
  ensureMdExtension,
  fileBasename,
  pickOpenMarkdown,
  pickSaveMarkdown,
  readMarkdownFile,
  writeMarkdownFile,
} from "@/lib/fs/documentIo";
import {
  buildMarkdownTree,
  folderDisplayName,
  pickOpenFolder,
  type TreeNode,
} from "@/lib/fs/workspaceIo";
import {
  exportDocumentDocx,
  exportDocumentHtml,
  exportDocumentPdf,
  exportDocumentPng,
  type ExportDoc,
} from "@/lib/export/runExports";
import {
  persistRecentNow,
  persistWorkspacePath,
} from "@/lib/prefs/persistence";
import { discardTabEditorState } from "@/lib/editor/tabEditorStates";
import { askSaveDiscardCancel } from "@/lib/dialog/saveChoice";
import { rememberDiskMtime } from "@/composables/useExternalFileWatch";
import { t } from "@/lib/i18n";

async function noteRecent(path: string) {
  useSessionStore().touchRecent(path, fileBasename(path));
  await persistRecentNow();
}

function countMdFiles(nodes: TreeNode[]): number {
  let n = 0;
  for (const node of nodes) {
    if (node.kind === "file") n += 1;
    else n += countMdFiles(node.children);
  }
  return n;
}

function currentExportDoc(editor: ReturnType<typeof useEditorStore>): ExportDoc {
  return {
    content: editor.content,
    fileName: editor.fileName,
    filePath: editor.filePath,
  };
}

/**
 * 文档相关操作：打开/保存/工作区/关 Tab。
 * 导出实现见 `@/lib/export/runExports`，此处仅转发以保持菜单等调用方 API 不变。
 */
export function useDocumentActions() {
  const editor = useEditorStore();
  const tabs = useTabsStore();
  const workspace = useWorkspaceStore();

  async function openFile() {
    try {
      const path = await pickOpenMarkdown();
      if (!path) return;
      const text = await readMarkdownFile(path);
      tabs.openOrFocus(path, fileBasename(path), text);
      await rememberDiskMtime(path);
      await noteRecent(path);
      ElMessage.success(t("msg.opened", { name: fileBasename(path) }));
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : t("msg.openFail"));
    }
  }

  async function openFolder() {
    try {
      const path = await pickOpenFolder();
      if (!path) return;
      workspace.treeLoading = true;
      workspace.sidebarVisible = true;
      const tree = await buildMarkdownTree(path);
      workspace.setWorkspace(path, folderDisplayName(path), tree);
      await persistWorkspacePath(path);
      const mdCount = countMdFiles(tree);
      ElMessage.success(
        mdCount > 0
          ? t("msg.openedWorkspace", { n: mdCount })
          : t("msg.openedWorkspaceEmpty"),
      );
    } catch (e) {
      ElMessage.error(
        e instanceof Error ? e.message : t("msg.openFolderFail"),
      );
    } finally {
      workspace.treeLoading = false;
    }
  }

  async function refreshFolder() {
    if (!workspace.rootPath) {
      ElMessage.info(t("msg.noFolder"));
      return;
    }
    try {
      workspace.treeLoading = true;
      const tree = await buildMarkdownTree(workspace.rootPath);
      workspace.setWorkspace(
        workspace.rootPath,
        workspace.rootName ?? folderDisplayName(workspace.rootPath),
        tree,
      );
      ElMessage.success(t("msg.treeRefreshed"));
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : t("msg.refreshFail"));
    } finally {
      workspace.treeLoading = false;
    }
  }

  async function openPathInTab(path: string) {
    try {
      const existing = tabs.tabs.find((tab) => tab.path === path);
      if (existing) {
        tabs.activate(existing.id);
        await noteRecent(path);
        return;
      }
      const text = await readMarkdownFile(path);
      tabs.openOrFocus(path, fileBasename(path), text);
      await rememberDiskMtime(path);
      await noteRecent(path);
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : t("msg.openFileFail"));
    }
  }

  async function clearRecentFiles() {
    useSessionStore().clearRecent();
    await persistRecentNow();
    ElMessage.success(t("msg.recentCleared"));
  }

  async function saveFile(): Promise<boolean> {
    try {
      if (editor.filePath) {
        await writeMarkdownFile(editor.filePath, editor.content);
        editor.markSaved();
        await rememberDiskMtime(editor.filePath);
        return true;
      }
      return await saveFileAs();
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : t("msg.saveFail"));
      return false;
    }
  }

  async function saveFileAs(): Promise<boolean> {
    try {
      const picked = await pickSaveMarkdown(
        editor.filePath ?? editor.fileName,
      );
      if (!picked) return false;
      const path = ensureMdExtension(picked);
      await writeMarkdownFile(path, editor.content);
      tabs.updateActiveMeta(path, fileBasename(path));
      tabs.markActiveSaved();
      await rememberDiskMtime(path);
      await noteRecent(path);
      ElMessage.success(t("msg.savedAs", { name: fileBasename(path) }));
      return true;
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : t("msg.saveAsFail"));
      return false;
    }
  }

  /** 保存指定 Tab（关窗/关 Tab 时用）；无路径则先激活再另存为 */
  async function saveTab(tab: DocTab): Promise<boolean> {
    if (tab.path) {
      try {
        await writeMarkdownFile(tab.path, tab.content);
        tab.dirty = false;
        await rememberDiskMtime(tab.path);
        return true;
      } catch (e) {
        ElMessage.error(e instanceof Error ? e.message : t("msg.saveFail"));
        return false;
      }
    }
    tabs.activate(tab.id);
    return await saveFileAs();
  }

  async function exportHtml() {
    await exportDocumentHtml(currentExportDoc(editor));
  }

  async function exportPdf() {
    await exportDocumentPdf(currentExportDoc(editor));
  }

  async function exportPng() {
    await exportDocumentPng(currentExportDoc(editor));
  }

  async function exportDocx() {
    await exportDocumentDocx(currentExportDoc(editor));
  }

  async function closeTab(id: string) {
    const tab = tabs.tabs.find((item) => item.id === id);
    if (!tab) return;

    if (tab.dirty) {
      const choice = await askSaveDiscardCancel(
        t("msg.unsavedAsk", { name: tab.name }),
      );
      if (choice === "cancel") return;
      if (choice === "save") {
        const ok = await saveTab(tab);
        if (!ok) return;
      }
    }

    discardTabEditorState(id);
    tabs.closeTab(id);
  }

  /** 按顺序关闭多个 Tab；任一取消则中止。返回是否全部完成 */
  async function closeTabsByIds(ids: string[]): Promise<boolean> {
    for (const id of ids) {
      if (!tabs.tabs.some((tab) => tab.id === id)) continue;
      const before = tabs.tabs.length;
      await closeTab(id);
      // dirty 取消时 Tab 仍在
      if (
        tabs.tabs.length === before &&
        tabs.tabs.some((tab) => tab.id === id)
      ) {
        return false;
      }
    }
    return true;
  }

  async function closeTabsToTheRight(id: string) {
    const index = tabs.tabs.findIndex((tab) => tab.id === id);
    if (index < 0) return;
    const ids = tabs.tabs.slice(index + 1).map((tab) => tab.id);
    await closeTabsByIds(ids);
  }

  async function closeOtherTabs(id: string) {
    const ids = tabs.tabs.filter((tab) => tab.id !== id).map((tab) => tab.id);
    await closeTabsByIds(ids);
  }

  async function closeAllTabs() {
    const ids = tabs.tabs.map((tab) => tab.id);
    await closeTabsByIds(ids);
  }

  async function closeActiveTab() {
    await closeTab(tabs.activeId);
  }

  function newFile() {
    tabs.newUntitled();
  }

  /** 关窗：对每个未保存文档询问 保存/不保存/取消 */
  async function confirmCloseWithSave(): Promise<boolean> {
    const dirtyTabs = tabs.tabs.filter((tab) => tab.dirty);
    if (dirtyTabs.length === 0) return true;

    for (const tab of dirtyTabs) {
      const choice = await askSaveDiscardCancel(
        t("msg.unsavedQuitAsk", { name: tab.name }),
      );
      if (choice === "cancel") return false;
      if (choice === "save") {
        const ok = await saveTab(tab);
        if (!ok) return false;
      }
    }
    return true;
  }

  return {
    openFile,
    openFolder,
    refreshFolder,
    openPathInTab,
    clearRecentFiles,
    saveFile,
    saveFileAs,
    exportHtml,
    exportPdf,
    exportPng,
    exportDocx,
    closeTab,
    closeActiveTab,
    closeTabsToTheRight,
    closeOtherTabs,
    closeAllTabs,
    newFile,
    confirmCloseWithSave,
    /** @deprecated 使用 confirmCloseWithSave */
    confirmDiscardAllDirty: confirmCloseWithSave,
  };
}
