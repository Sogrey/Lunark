import { ask } from "@tauri-apps/plugin-dialog";
import { ElMessage } from "element-plus";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  fileBasename,
  pickSaveDocx,
  pickSaveHtml,
  pickSavePdf,
  pickSavePng,
  writeBinaryFileAt,
  writeTextFileAt,
} from "@/lib/fs/documentIo";
import { buildExportHtml, printHtmlAsPdf } from "@/lib/export/htmlExport";
import {
  exportMarkdownToPdfFile,
  prepareTypstMarkdown,
} from "@/lib/export/typstPdf";
import {
  exportMarkdownToPngBytes,
  pngNameFromMd,
} from "@/lib/export/imageExport";
import {
  docNameFromMd,
  exportMarkdownToDocBytes,
} from "@/lib/export/wordExport";
import { t } from "@/lib/i18n";

/** 当前文档导出上下文（来自 editor store） */
export type ExportDoc = {
  content: string;
  fileName: string;
  filePath: string | null;
};

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

async function confirmExportWithoutPath(doc: ExportDoc): Promise<boolean> {
  if (doc.filePath) return true;
  if (!hasLocalImageRefs(doc.content)) return true;
  ElMessage.warning(t("msg.exportUnsavedWarn"));
  try {
    return await ask(t("msg.exportUnsavedConfirm"), {
      title: "Lunark",
      kind: "warning",
    });
  } catch {
    return window.confirm(t("msg.exportUnsavedConfirmBrowser"));
  }
}

export async function exportDocumentHtml(doc: ExportDoc): Promise<void> {
  try {
    if (!(await confirmExportWithoutPath(doc))) return;
    const defaultName = htmlNameFromMd(doc.fileName);
    const path = await pickSaveHtml(defaultName);
    if (!path) return;
    const out =
      path.toLowerCase().endsWith(".html") ||
      path.toLowerCase().endsWith(".htm")
        ? path
        : `${path}.html`;
    const html = await buildExportHtml(
      doc.content,
      doc.fileName,
      doc.filePath,
    );
    await writeTextFileAt(out, html);
    ElMessage.success(t("msg.exported", { name: fileBasename(out) }));
    await revealExported(out);
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : t("msg.exportHtmlFail"));
  }
}

export async function exportDocumentPdf(doc: ExportDoc): Promise<void> {
  let loading: ReturnType<typeof ElMessage> | null = null;
  try {
    if (!(await confirmExportWithoutPath(doc))) return;
    const picked = await pickSavePdf(pdfNameFromMd(doc.fileName));
    if (!picked) return;
    const out = picked.toLowerCase().endsWith(".pdf")
      ? picked
      : `${picked}.pdf`;

    loading = ElMessage({
      message: t("msg.exportingPdf"),
      type: "info",
      duration: 0,
      showClose: false,
    });

    const prepared = await prepareTypstMarkdown(doc.content, doc.filePath);
    try {
      await exportMarkdownToPdfFile(
        prepared.markdown,
        out,
        prepared.resourceDir,
      );
      loading.close();
      loading = null;
      ElMessage.success(
        t("msg.exportedPdf", { name: fileBasename(out) }),
      );
      await revealExported(out);
    } catch (e) {
      loading?.close();
      loading = null;
      const msg = e instanceof Error ? e.message : String(e);
      const usePrint = await ask(t("msg.pdfFallbackAsk", { msg }), {
        title: "Lunark",
        kind: "warning",
      });
      if (!usePrint) return;
      const html = await buildExportHtml(
        doc.content,
        doc.fileName,
        doc.filePath,
        "print",
      );
      await printHtmlAsPdf(html, doc.fileName);
      ElMessage.info(t("msg.pdfPrintHint"));
    } finally {
      await prepared.cleanup();
    }
  } catch (e) {
    loading?.close();
    ElMessage.error(e instanceof Error ? e.message : t("msg.exportPdfFail"));
  }
}

export async function exportDocumentPng(doc: ExportDoc): Promise<void> {
  let loading: ReturnType<typeof ElMessage> | null = null;
  try {
    if (!(await confirmExportWithoutPath(doc))) return;
    const picked = await pickSavePng(pngNameFromMd(doc.fileName));
    if (!picked) return;
    const out = picked.toLowerCase().endsWith(".png")
      ? picked
      : `${picked}.png`;

    loading = ElMessage({
      message: t("msg.exportingImage"),
      type: "info",
      duration: 0,
      showClose: false,
    });
    const bytes = await exportMarkdownToPngBytes(
      doc.content,
      doc.fileName,
      doc.filePath,
    );
    await writeBinaryFileAt(out, bytes);
    loading.close();
    loading = null;
    ElMessage.success(t("msg.exportedImage", { name: fileBasename(out) }));
    await revealExported(out);
  } catch (e) {
    loading?.close();
    ElMessage.error(e instanceof Error ? e.message : t("msg.exportImageFail"));
  }
}

export async function exportDocumentDocx(doc: ExportDoc): Promise<void> {
  let loading: ReturnType<typeof ElMessage> | null = null;
  try {
    if (!(await confirmExportWithoutPath(doc))) return;
    const picked = await pickSaveDocx(docNameFromMd(doc.fileName));
    if (!picked) return;
    const out =
      picked.toLowerCase().endsWith(".doc") ||
      picked.toLowerCase().endsWith(".docx")
        ? picked.replace(/\.docx$/i, ".doc")
        : `${picked}.doc`;

    loading = ElMessage({
      message: t("msg.exportingWord"),
      type: "info",
      duration: 0,
      showClose: false,
    });
    const bytes = await exportMarkdownToDocBytes(
      doc.content,
      doc.fileName,
      doc.filePath,
    );
    await writeBinaryFileAt(out, bytes);
    loading.close();
    loading = null;
    ElMessage.success(t("msg.exportedWord", { name: fileBasename(out) }));
    await revealExported(out);
  } catch (e) {
    loading?.close();
    ElMessage.error(e instanceof Error ? e.message : t("msg.exportWordFail"));
  }
}
