/**
 * 选文件插入图片：与粘贴/拖放同一 resolve 管线。
 */

import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { ElMessage } from "element-plus";
import { getFormatBridge } from "@/lib/editor/formatBridge";
import {
  insertMarkdownAtCursor,
} from "@/lib/editor/imageInput";
import { joinImageSnippets } from "@/lib/editor/insertText";
import { resolveImagePaths } from "@/lib/editor/resolveImages";
import { grantUserPath } from "@/lib/fs/scope";
import { t } from "@/lib/i18n";

const IMAGE_FILTERS = [
  {
    name: "Image",
    extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"],
  },
  { name: "All", extensions: ["*"] },
];

async function pickImagePaths(): Promise<string[]> {
  if (!isTauri()) {
    ElMessage.info(t("msg.needTauriImage"));
    return [];
  }
  const selected = await open({
    multiple: true,
    directory: false,
    title: t("msg.dialogInsertImage"),
    filters: IMAGE_FILTERS,
  });
  if (selected === null) return [];
  const paths = Array.isArray(selected) ? selected : [selected];
  for (const p of paths) {
    await grantUserPath(p);
  }
  return paths;
}

function insertSnippets(snippets: string[]): void {
  const text = joinImageSnippets(snippets);
  if (!text) return;
  const bridge = getFormatBridge();
  if (bridge) {
    bridge.focus();
    bridge.insertSnippet(text.endsWith("\n") ? text : `${text}\n`);
    return;
  }
  insertMarkdownAtCursor(text);
}

/** 打开系统选图对话框 → 统一管线 → 插入光标处 */
export async function pickAndInsertImages(): Promise<boolean> {
  try {
    const paths = await pickImagePaths();
    if (paths.length === 0) return false;

    const { snippets } = await resolveImagePaths(paths);
    if (snippets.length === 0) {
      ElMessage.info(t("msg.noImageRecognized"));
      return true;
    }
    insertSnippets(snippets);
    ElMessage.success(
      snippets.length === 1
        ? t("msg.imageInserted")
        : t("msg.imagesInserted", { n: snippets.length }),
    );
    return true;
  } catch (e) {
    if (e instanceof Error && e.message === "DOC_UNSAVED") {
      ElMessage.warning(t("msg.saveDocBeforeImage"));
      return true;
    }
    ElMessage.error(
      e instanceof Error ? e.message : t("msg.imageInsertFail"),
    );
    return true;
  }
}
