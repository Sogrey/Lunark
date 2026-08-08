import { oneDark } from "@codemirror/theme-one-dark";
import { languages } from "@codemirror/language-data";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { dirname, isAbsolute, join } from "@tauri-apps/api/path";
import { Crepe, type CrepeConfig } from "@milkdown/crepe";
import { ElMessage } from "element-plus";
import { useEditorStore } from "@/stores/editor";
import { isImageFile, saveDroppedImages } from "@/lib/fs/imageDrop";
import { renderMermaidSvg } from "@/lib/markdown/mermaid";
import { t } from "@/lib/i18n";

function looksAbsoluteLocal(src: string): boolean {
  return (
    /^[a-zA-Z]:[\\/]/.test(src) ||
    src.startsWith("\\\\") ||
    src.startsWith("/")
  );
}

async function resolveLocalImageUrl(url: string): Promise<string> {
  if (!isTauri()) return url;
  if (/^(?:https?:|data:|blob:|asset:)/i.test(url)) return url;

  const editor = useEditorStore();
  if (!editor.filePath) return url;

  try {
    const decoded = decodeURI(url.trim());
    const docDir = await dirname(editor.filePath);
    const absolute =
      looksAbsoluteLocal(decoded) || (await isAbsolute(decoded))
        ? decoded
        : await join(docDir, decoded);
    return convertFileSrc(absolute);
  } catch {
    return url;
  }
}

/** 写入 ./assets/，返回 Markdown 可用的相对路径 */
async function uploadImageFile(file: File): Promise<string> {
  if (!isImageFile(file)) {
    throw new Error(t("msg.imageOnly"));
  }
  const editor = useEditorStore();
  if (!editor.filePath) {
    ElMessage.warning(t("msg.saveDocBeforeImage"));
    throw new Error(t("msg.docUnsaved"));
  }
  const snippets = await saveDroppedImages([file], editor.filePath);
  const first = snippets[0] ?? "";
  const m = first.match(/\(([^)]+)\)/);
  if (!m?.[1]) throw new Error(t("msg.imageSaveFail"));
  return m[1];
}

function renderMermaidPreview(
  language: string,
  content: string,
): HTMLElement | null {
  if (language.toLowerCase() !== "mermaid") return null;
  const wrap = document.createElement("div");
  wrap.className = "lunark-mermaid-preview";
  wrap.textContent = t("editor.mermaidRendering");
  const mode =
    document.documentElement.getAttribute("data-theme-mode") === "light"
      ? "light"
      : "dark";
  void renderMermaidSvg(content, mode).then((svg) => {
    if (!svg) {
      wrap.textContent = t("editor.emptyDiagram");
      return;
    }
    wrap.innerHTML = svg;
  });
  return wrap;
}

/**
 * Crepe 配置：对齐一期 Night + KaTeX + 代码 + 图片 + Mermaid 预览。
 */
export function buildCrepeConfig(defaultValue: string): CrepeConfig {
  return {
    root: null,
    defaultValue,
    features: {
      [Crepe.Feature.AI]: false,
      [Crepe.Feature.Latex]: true,
      [Crepe.Feature.CodeMirror]: true,
      [Crepe.Feature.ImageBlock]: true,
      [Crepe.Feature.Table]: true,
      [Crepe.Feature.ListItem]: true,
    },
    featureConfigs: {
      [Crepe.Feature.Placeholder]: {
        text: t("editor.placeholder"),
        mode: "block",
      },
      // 行首「+」菜单（与右键插入同源命令）
      [Crepe.Feature.BlockEdit]: {
        textGroup: {
          label: t("editor.textGroup"),
          text: { label: t("editor.plainText") },
          h1: { label: t("editor.h1") },
          h2: { label: t("editor.h2") },
          h3: { label: t("editor.h3") },
          h4: { label: t("editor.h4") },
          h5: { label: t("editor.h5") },
          h6: { label: t("editor.h6") },
          quote: { label: t("editor.quote") },
          divider: { label: t("editor.hr") },
        },
        listGroup: {
          label: t("editor.listGroup"),
          bulletList: { label: t("editor.bulletList") },
          orderedList: { label: t("editor.orderedList") },
          taskList: { label: t("editor.taskList") },
        },
        advancedGroup: {
          label: t("editor.advancedGroup"),
          image: { label: t("editor.image") },
          codeBlock: { label: t("editor.codeBlock") },
          table: { label: t("editor.table") },
          math: { label: t("editor.math") },
        },
      },
      [Crepe.Feature.CodeMirror]: {
        theme: oneDark,
        languages,
        searchPlaceholder: t("editor.searchLang"),
        copyText: t("help.copy"),
        noResultText: t("editor.noLangMatch"),
        previewToggleText: (previewOnly) =>
          previewOnly ? t("editor.edit") : t("editor.preview"),
        previewLabel: t("editor.preview"),
        renderPreview: renderMermaidPreview,
      },
      [Crepe.Feature.ImageBlock]: {
        onUpload: uploadImageFile,
        inlineOnUpload: uploadImageFile,
        blockOnUpload: uploadImageFile,
        proxyDomURL: resolveLocalImageUrl,
        inlineUploadButton: t("editor.upload"),
        inlineUploadPlaceholderText: t("editor.orPasteImageUrl"),
        blockUploadButton: t("editor.uploadImage"),
        blockUploadPlaceholderText: t("editor.clickUploadOrPaste"),
        blockCaptionPlaceholderText: t("editor.imageCaption"),
        onImageLoadError: () => {
          ElMessage.warning(t("msg.imageLoadFail"));
        },
      },
      [Crepe.Feature.Latex]: {
        inlineEditConfirm: t("editor.confirm"),
      },
    },
  };
}
