/**
 * 插入图片统一契约：图床优先 → 失败/未开启则本地 ./assets/。
 * 粘贴、拖放、Crepe 上传、选文件插入共用此管线。
 */

import { ElMessage } from "element-plus";
import { useEditorStore } from "@/stores/editor";
import {
  isImageFile,
  isImagePath,
  saveDroppedImages,
  saveImagesFromPaths,
  toMarkdownImage,
} from "@/lib/fs/imageDrop";
import {
  toMarkdownImagesFromUrls,
  uploadFilesToPicgo,
  uploadPathsToPicgo,
} from "@/lib/fs/picgo";
import { resolveActiveHost } from "@/lib/fs/imageHosts";
import { t } from "@/lib/i18n";

export type ImageInsertSource = "paste" | "drop" | "pick" | "upload";

export interface ResolvedImages {
  /** 完整 Markdown 行：![alt](url) */
  snippets: string[];
  /** 仅 URL / 相对路径（Crepe onUpload） */
  refs: string[];
}

function activeEndpoint(): string {
  const editor = useEditorStore();
  const host = resolveActiveHost(editor.imageHosts, editor.activeImageHostId);
  return (host?.endpoint || editor.picgoEndpoint || "").trim();
}

function hostEnabled(): boolean {
  return useEditorStore().picgoEnabled;
}

/** 从 `![alt](ref)` 取出 ref */
export function refFromMarkdownImage(snippet: string): string | null {
  const m = /!\[[^\]]*\]\(([^)]+)\)/.exec(snippet.trim());
  return m?.[1]?.trim() || null;
}

export function refsFromSnippets(snippets: string[]): string[] {
  return snippets
    .map(refFromMarkdownImage)
    .filter((r): r is string => !!r);
}

/**
 * DOM File（粘贴 / 浏览器拖放 / Crepe 上传）→ Markdown 片段与 refs。
 * 未保存文档且需写本地 assets 时抛错（调用方决定提示文案）。
 */
export async function resolveImageFiles(
  files: File[],
): Promise<ResolvedImages> {
  const list = files.filter(isImageFile);
  if (list.length === 0) return { snippets: [], refs: [] };

  const editor = useEditorStore();

  if (hostEnabled()) {
    try {
      const { urls } = await uploadFilesToPicgo(list, activeEndpoint());
      const snippets = toMarkdownImagesFromUrls(urls);
      return { snippets, refs: urls };
    } catch (e) {
      ElMessage.warning(
        e instanceof Error ? e.message : t("msg.picgoFail"),
      );
    }
  }

  if (!editor.filePath) {
    throw new Error("DOC_UNSAVED");
  }

  const snippets = await saveDroppedImages(list, editor.filePath);
  return { snippets, refs: refsFromSnippets(snippets) };
}

/** 本机绝对路径（Tauri 拖放 / 选文件） */
export async function resolveImagePaths(
  paths: string[],
): Promise<ResolvedImages> {
  const imagePaths = paths.filter(isImagePath);
  if (imagePaths.length === 0) return { snippets: [], refs: [] };

  const editor = useEditorStore();

  if (hostEnabled()) {
    try {
      const { urls } = await uploadPathsToPicgo(imagePaths, activeEndpoint());
      const snippets = toMarkdownImagesFromUrls(urls);
      return { snippets, refs: urls };
    } catch (e) {
      ElMessage.warning(
        e instanceof Error ? e.message : t("msg.picgoFail"),
      );
    }
  }

  if (!editor.filePath) {
    throw new Error("DOC_UNSAVED");
  }

  const snippets = await saveImagesFromPaths(imagePaths, editor.filePath);
  return { snippets, refs: refsFromSnippets(snippets) };
}

/** 单文件上传（Crepe ImageBlock）：返回可写入节点的 src */
export async function resolveOneImageFile(file: File): Promise<string> {
  if (!isImageFile(file)) {
    throw new Error(t("msg.imageOnly"));
  }
  try {
    const { refs } = await resolveImageFiles([file]);
    const ref = refs[0];
    if (!ref) throw new Error(t("msg.imageSaveFail"));
    return ref;
  } catch (e) {
    if (e instanceof Error && e.message === "DOC_UNSAVED") {
      ElMessage.warning(t("msg.saveDocBeforeImage"));
      throw new Error(t("msg.docUnsaved"));
    }
    throw e;
  }
}

/** 占位语法（无真实文件时的回退，一般不再用于菜单） */
export function placeholderImageMarkdown(): string {
  return toMarkdownImage(t("editor.imageAlt"), "./assets/image.png");
}
