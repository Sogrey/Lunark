import { ask } from "@tauri-apps/plugin-dialog";
import { ElMessage } from "element-plus";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useEditorStore } from "@/stores/editor";
import { useTabsStore, type DocTab } from "@/stores/tabs";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  ensureMdExtension,
  fileBasename,
  pickOpenMarkdown,
  pickSaveHtml,
  pickSaveMarkdown,
  pickSavePdf,
  readMarkdownFile,
  writeMarkdownFile,
  writeTextFileAt,
} from "@/lib/fs/documentIo";
import {
  buildMarkdownTree,
  folderDisplayName,
  pickOpenFolder,
} from "@/lib/fs/workspaceIo";
import {
  buildExportHtml,
  printHtmlAsPdf,
} from "@/lib/export/htmlExport";
import {
  exportMarkdownToPdfFile,
  prepareTypstMarkdown,
} from "@/lib/export/typstPdf";
import { persistWorkspacePath } from "@/lib/prefs/persistence";
import { discardTabEditorState } from "@/lib/editor/tabEditorStates";
import { askSaveDiscardCancel } from "@/lib/dialog/saveChoice";
import { rememberDiskMtime } from "@/composables/useExternalFileWatch";

function pdfNameFromMd(name: string): string {
  return name.replace(/\.(md|markdown|mdown|mkd)$/i, "") + ".pdf";
}

function htmlNameFromMd(name: string): string {
  return name.replace(/\.(md|markdown|mdown|mkd)$/i, "") + ".html";
}

function hasLocalImageRefs(source: string): boolean {
  return /!\[[^\]]*]\(\s*(?:\.\.?\/|\/|[a-zA-Z]:)/.test(source);
}

async function revealExported(path: string) {
  try {
    await revealItemInDir(path);
  } catch {
    /* 可选能力，失败静默 */
  }
}

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
      ElMessage.success(`已打开 ${fileBasename(path)}`);
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : "打开失败");
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
          ? `已打开工作区（${mdCount} 个 Markdown）`
          : "已打开工作区（未找到 .md 文件）",
      );
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : "打开文件夹失败");
    } finally {
      workspace.treeLoading = false;
    }
  }

  async function refreshFolder() {
    if (!workspace.rootPath) {
      ElMessage.info("尚未打开文件夹");
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
      ElMessage.success("文件树已刷新");
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : "刷新失败");
    } finally {
      workspace.treeLoading = false;
    }
  }

  async function openPathInTab(path: string) {
    try {
      const existing = tabs.tabs.find((t) => t.path === path);
      if (existing) {
        tabs.activate(existing.id);
        return;
      }
      const text = await readMarkdownFile(path);
      tabs.openOrFocus(path, fileBasename(path), text);
      await rememberDiskMtime(path);
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : "打开文件失败");
    }
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
      ElMessage.error(e instanceof Error ? e.message : "保存失败");
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
      ElMessage.success(`已保存为 ${fileBasename(path)}`);
      return true;
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : "另存为失败");
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
        ElMessage.error(e instanceof Error ? e.message : "保存失败");
        return false;
      }
    }
    tabs.activate(tab.id);
    return await saveFileAs();
  }

  async function confirmExportWithoutPath(): Promise<boolean> {
    if (editor.filePath) return true;
    if (!hasLocalImageRefs(editor.content)) return true;
    ElMessage.warning("文档尚未保存到磁盘，导出中的相对路径图片将无法嵌入");
    try {
      return await ask(
        "当前文档未保存。相对路径图片无法嵌入导出结果。仍要继续导出吗？",
        { title: "Lunark", kind: "warning" },
      );
    } catch {
      return window.confirm("文档未保存，相对图片无法嵌入。仍要导出吗？");
    }
  }

  async function exportHtml() {
    try {
      if (!(await confirmExportWithoutPath())) return;
      const defaultName = htmlNameFromMd(editor.fileName);
      const path = await pickSaveHtml(defaultName);
      if (!path) return;
      const out =
        path.toLowerCase().endsWith(".html") ||
        path.toLowerCase().endsWith(".htm")
          ? path
          : `${path}.html`;
      const html = await buildExportHtml(
        editor.content,
        editor.fileName,
        editor.filePath,
      );
      await writeTextFileAt(out, html);
      ElMessage.success(`已导出 ${fileBasename(out)}`);
      await revealExported(out);
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : "导出 HTML 失败");
    }
  }

  async function exportPdf() {
    let loading: ReturnType<typeof ElMessage> | null = null;
    try {
      if (!(await confirmExportWithoutPath())) return;
      const picked = await pickSavePdf(pdfNameFromMd(editor.fileName));
      if (!picked) return;
      const out = picked.toLowerCase().endsWith(".pdf")
        ? picked
        : `${picked}.pdf`;

      loading = ElMessage({
        message: "正在导出 PDF（Typst）…",
        type: "info",
        duration: 0,
        showClose: false,
      });

      const prepared = await prepareTypstMarkdown(
        editor.content,
        editor.filePath,
      );
      try {
        await exportMarkdownToPdfFile(
          prepared.markdown,
          out,
          prepared.resourceDir,
        );
        loading.close();
        loading = null;
        ElMessage.success(`已导出 PDF（Typst）：${fileBasename(out)}`);
        await revealExported(out);
      } catch (e) {
        loading?.close();
        loading = null;
        const msg = e instanceof Error ? e.message : String(e);
        const usePrint = await ask(
          `Typst 导出失败：\n${msg}\n\n是否改用系统打印对话框（选择「打印到 PDF」）？`,
          { title: "Lunark", kind: "warning" },
        );
        if (!usePrint) return;
        const html = await buildExportHtml(
          editor.content,
          editor.fileName,
          editor.filePath,
          "print",
        );
        await printHtmlAsPdf(html, editor.fileName);
        ElMessage.info(
          "请在打印对话框中选择「Microsoft Print to PDF」或系统 PDF 打印机",
        );
      } finally {
        await prepared.cleanup();
      }
    } catch (e) {
      loading?.close();
      ElMessage.error(e instanceof Error ? e.message : "导出 PDF 失败");
    }
  }

  async function closeTab(id: string) {
    const tab = tabs.tabs.find((t) => t.id === id);
    if (!tab) return;

    if (tab.dirty) {
      const choice = await askSaveDiscardCancel(
        `「${tab.name}」有未保存更改，是否保存？`,
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

  async function closeActiveTab() {
    await closeTab(tabs.activeId);
  }

  function newFile() {
    tabs.newUntitled();
  }

  /** 关窗：对每个未保存文档询问 保存/不保存/取消 */
  async function confirmCloseWithSave(): Promise<boolean> {
    const dirtyTabs = tabs.tabs.filter((t) => t.dirty);
    if (dirtyTabs.length === 0) return true;

    for (const tab of dirtyTabs) {
      const choice = await askSaveDiscardCancel(
        `「${tab.name}」有未保存更改，是否保存后再退出？`,
      );
      if (choice === "cancel") return false;
      if (choice === "save") {
        const ok = await saveTab(tab);
        if (!ok) return false;
      }
      // discard：继续下一个
    }
    return true;
  }

  return {
    openFile,
    openFolder,
    refreshFolder,
    openPathInTab,
    saveFile,
    saveFileAs,
    exportHtml,
    exportPdf,
    closeTab,
    closeActiveTab,
    newFile,
    confirmCloseWithSave,
    /** @deprecated 使用 confirmCloseWithSave */
    confirmDiscardAllDirty: confirmCloseWithSave,
  };
}

function countMdFiles(nodes: import("@/lib/fs/workspaceIo").TreeNode[]): number {
  let n = 0;
  for (const node of nodes) {
    if (node.kind === "file") n += 1;
    else n += countMdFiles(node.children);
  }
  return n;
}
