import { oneDark } from "@codemirror/theme-one-dark";
import { languages } from "@codemirror/language-data";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { dirname, isAbsolute, join } from "@tauri-apps/api/path";
import { Crepe, type CrepeConfig } from "@milkdown/crepe";
import { ElMessage } from "element-plus";
import { useEditorStore } from "@/stores/editor";
import {
  encodeAssetPath,
  isImageFile,
  saveDroppedImages,
} from "@/lib/fs/imageDrop";
import { renderMermaidSvg } from "@/lib/markdown/mermaid";
import { isThemeId, themeMeta } from "@/lib/theme/catalog";

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
    throw new Error("仅支持图片文件");
  }
  const editor = useEditorStore();
  if (!editor.filePath) {
    ElMessage.warning("请先保存文档，再插入图片（将写入 ./assets/）");
    throw new Error("文档未保存");
  }
  const snippets = await saveDroppedImages([file], editor.filePath);
  const first = snippets[0] ?? "";
  const m = first.match(/\(([^)]+)\)/);
  if (!m?.[1]) throw new Error("图片保存失败");
  return m[1];
}

function renderMermaidPreview(
  language: string,
  content: string,
): HTMLElement | null {
  if (language.toLowerCase() !== "mermaid") return null;
  const wrap = document.createElement("div");
  wrap.className = "lunark-mermaid-preview";
  wrap.textContent = "Mermaid 渲染中…";
  const attr = document.documentElement.getAttribute("data-theme");
  const mode =
    isThemeId(attr) && themeMeta(attr).dark ? "dark" : "light";
  void renderMermaidSvg(content, mode).then((svg) => {
    if (!svg) {
      wrap.textContent = "空图表";
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
        text: "开始写作…",
        mode: "block",
      },
      // 行首「+」菜单中文（与右键插入同源命令）
      [Crepe.Feature.BlockEdit]: {
        textGroup: {
          label: "文本",
          text: { label: "正文" },
          h1: { label: "一级标题" },
          h2: { label: "二级标题" },
          h3: { label: "三级标题" },
          h4: { label: "四级标题" },
          h5: { label: "五级标题" },
          h6: { label: "六级标题" },
          quote: { label: "引用" },
          divider: { label: "分割线" },
        },
        listGroup: {
          label: "列表",
          bulletList: { label: "无序列表" },
          orderedList: { label: "有序列表" },
          taskList: { label: "任务列表" },
        },
        advancedGroup: {
          label: "高级",
          image: { label: "图像" },
          codeBlock: { label: "代码块" },
          table: { label: "表格" },
          math: { label: "公式" },
        },
      },
      [Crepe.Feature.CodeMirror]: {
        theme: oneDark,
        languages,
        searchPlaceholder: "搜索语言",
        copyText: "复制",
        noResultText: "无匹配语言",
        previewToggleText: (previewOnly) => (previewOnly ? "编辑" : "预览"),
        previewLabel: "预览",
        renderPreview: renderMermaidPreview,
      },
      [Crepe.Feature.ImageBlock]: {
        onUpload: uploadImageFile,
        inlineOnUpload: uploadImageFile,
        blockOnUpload: uploadImageFile,
        proxyDomURL: resolveLocalImageUrl,
        inlineUploadButton: "上传",
        inlineUploadPlaceholderText: "或粘贴图片链接",
        blockUploadButton: "上传图片",
        blockUploadPlaceholderText: "点击上传或粘贴链接",
        blockCaptionPlaceholderText: "图片说明",
        onImageLoadError: () => {
          ElMessage.warning("图片加载失败（检查路径或先保存文档）");
        },
      },
      [Crepe.Feature.Latex]: {
        inlineEditConfirm: "确认",
      },
    },
  };
}

export { encodeAssetPath };
