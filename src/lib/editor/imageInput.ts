import { EditorView } from "@codemirror/view";
import { ElMessage } from "element-plus";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEditorStore } from "@/stores/editor";
import {
  isImageFile,
  saveDroppedImages,
  saveImagesFromPaths,
} from "@/lib/fs/imageDrop";
import {
  insertTextAtCursor,
  joinImageSnippets,
} from "@/lib/editor/insertText";
import { t } from "@/lib/i18n";

function filesFromList(list: FileList | File[] | null | undefined): File[] {
  if (!list) return [];
  return Array.from(list).filter(isImageFile);
}

/** 不依赖 store 方法名，避免 HMR 后旧 store 缺方法 */
export function insertMarkdownAtCursor(text: string): void {
  const editor = useEditorStore();
  const view = editor.cmView;
  if (view) {
    insertTextAtCursor(view, text);
    editor.setContent(view.state.doc.toString());
    return;
  }
  const cur = editor.content;
  const next =
    cur && !cur.endsWith("\n") ? `${cur}\n\n${text}\n` : `${cur}${text}\n`;
  editor.setContent(next);
}

async function finishInsert(
  snippets: string[],
  source: "drop" | "paste",
): Promise<boolean> {
  if (snippets.length === 0) return false;
  insertMarkdownAtCursor(joinImageSnippets(snippets));
  ElMessage.success(
    snippets.length === 1
      ? source === "paste"
        ? t("msg.imagePasted")
        : t("msg.imageInserted")
      : source === "paste"
        ? t("msg.imagesPasted", { n: snippets.length })
        : t("msg.imagesInserted", { n: snippets.length }),
  );
  return true;
}

export async function insertDroppedOrPastedImages(
  files: File[],
  source: "drop" | "paste",
): Promise<boolean> {
  if (files.length === 0) return false;

  const editor = useEditorStore();
  if (!editor.filePath) {
    ElMessage.warning(
      source === "paste"
        ? t("msg.saveBeforePasteImage")
        : t("msg.saveBeforeDropImage"),
    );
    return true;
  }

  try {
    const snippets = await saveDroppedImages(files, editor.filePath);
    return await finishInsert(snippets, source);
  } catch (e) {
    ElMessage.error(
      e instanceof Error
        ? e.message
        : source === "paste"
          ? t("msg.imagePasteFail")
          : t("msg.imageInsertFail"),
    );
    return true;
  }
}

/** Tauri 原生拖放（路径列表）；DOM FileList 在 Tauri 下通常为空 */
export async function insertImagesFromOsPaths(
  paths: string[],
): Promise<boolean> {
  if (paths.length === 0) return false;

  const editor = useEditorStore();
  if (!editor.filePath) {
    ElMessage.warning(t("msg.saveBeforeDropImage"));
    return true;
  }

  try {
    const snippets = await saveImagesFromPaths(paths, editor.filePath);
    if (snippets.length === 0) {
      ElMessage.info(t("msg.noImageRecognized"));
      return true;
    }
    return await finishInsert(snippets, "drop");
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : t("msg.imageInsertFail"));
    return true;
  }
}

/**
 * 监听 Tauri 原生文件拖放。返回取消监听函数。
 * 回调用于更新 drop 高亮状态。
 */
export async function bindTauriFileDrop(opts: {
  onOver?: () => void;
  onLeave?: () => void;
}): Promise<() => void> {
  if (!isTauri()) return () => undefined;

  try {
    const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
      const { type } = event.payload;
      if (type === "over" || type === "enter") {
        opts.onOver?.();
      } else if (type === "leave") {
        opts.onLeave?.();
      } else if (type === "drop") {
        opts.onLeave?.();
        void insertImagesFromOsPaths(event.payload.paths);
      }
    });
    return unlisten;
  } catch (e) {
    console.warn("[lunark] bindTauriFileDrop failed", e);
    return () => undefined;
  }
}

/**
 * CM6：粘贴图片（DOM File）。拖放改由 Tauri onDragDropEvent 处理。
 */
export function imageInputExtension() {
  return EditorView.domEventHandlers({
    paste(event) {
      const items = event.clipboardData?.items;
      if (!items?.length) return false;

      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind !== "file") continue;
        const file = item.getAsFile();
        if (file && isImageFile(file)) files.push(file);
      }
      if (files.length === 0) return false;

      event.preventDefault();
      void insertDroppedOrPastedImages(files, "paste");
      return true;
    },
  });
}

/** 预览区等非 CM 区域的 DOM 拖放兜底（浏览器环境） */
export function onShellDragOver(event: DragEvent): boolean {
  const types = event.dataTransfer?.types;
  if (!types || !Array.from(types).some((t) => t.toLowerCase() === "files")) {
    return false;
  }
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  return true;
}

export function onShellDrop(event: DragEvent): boolean {
  const files = filesFromList(event.dataTransfer?.files);
  if (files.length === 0) return false;
  event.preventDefault();
  void insertDroppedOrPastedImages(files, "drop");
  return true;
}
