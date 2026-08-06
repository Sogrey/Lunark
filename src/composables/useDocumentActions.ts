import { ask } from "@tauri-apps/plugin-dialog";
import { ElMessage } from "element-plus";
import { useEditorStore } from "@/stores/editor";
import { useTabsStore } from "@/stores/tabs";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  ensureMdExtension,
  fileBasename,
  pickOpenMarkdown,
  pickSaveHtml,
  pickSaveMarkdown,
  readMarkdownFile,
  writeMarkdownFile,
  writeTextFileAt,
} from "@/lib/fs/documentIo";
import {
  buildMarkdownTree,
  folderDisplayName,
  pickOpenFolder,
} from "@/lib/fs/workspaceIo";
import { buildExportHtml, printHtmlAsPdf } from "@/lib/export/htmlExport";

function htmlNameFromMd(name: string): string {
  return name.replace(/\.(md|markdown|mdown|mkd)$/i, "") + ".html";
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
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : "打开文件失败");
    }
  }

  async function saveFile() {
    try {
      if (editor.filePath) {
        await writeMarkdownFile(editor.filePath, editor.content);
        editor.markSaved();
        ElMessage.success("已保存");
        return;
      }
      await saveFileAs();
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : "保存失败");
    }
  }

  async function saveFileAs() {
    try {
      const picked = await pickSaveMarkdown(
        editor.filePath ?? editor.fileName,
      );
      if (!picked) return;
      const path = ensureMdExtension(picked);
      await writeMarkdownFile(path, editor.content);
      tabs.updateActiveMeta(path, fileBasename(path));
      tabs.markActiveSaved();
      ElMessage.success(`已保存为 ${fileBasename(path)}`);
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : "另存为失败");
    }
  }

  async function exportHtml() {
    try {
      const defaultName = htmlNameFromMd(editor.fileName);
      const path = await pickSaveHtml(defaultName);
      if (!path) return;
      const out =
        path.toLowerCase().endsWith(".html") ||
        path.toLowerCase().endsWith(".htm")
          ? path
          : `${path}.html`;
      const html = await buildExportHtml(editor.content, editor.fileName);
      await writeTextFileAt(out, html);
      ElMessage.success(`已导出 ${fileBasename(out)}`);
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : "导出 HTML 失败");
    }
  }

  async function exportPdf() {
    try {
      const html = await buildExportHtml(editor.content, editor.fileName);
      printHtmlAsPdf(html, editor.fileName);
      ElMessage.info(
        "请在打印对话框中选择「Microsoft Print to PDF」或系统 PDF 打印机",
      );
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : "导出 PDF 失败");
    }
  }

  async function closeTab(id: string) {
    const tab = tabs.tabs.find((t) => t.id === id);
    if (!tab) return;

    if (tab.dirty) {
      try {
        const ok = await ask(
          `「${tab.name}」有未保存更改，关闭将丢弃更改。确定关闭？`,
          { title: "Lunark", kind: "warning" },
        );
        if (!ok) return;
      } catch {
        // 非 Tauri 环境回退
        if (!window.confirm(`「${tab.name}」有未保存更改，确定关闭？`)) return;
      }
    }

    tabs.closeTab(id);
  }

  function newFile() {
    tabs.newUntitled();
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
    newFile,
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
