import nightCss from "@/styles/themes/night.css?raw";
import nightPreviewCss from "@/styles/themes/night-preview.css?raw";
import katexCss from "katex/dist/katex.min.css?raw";
import { renderMarkdown } from "@/lib/markdown/renderer";
import { applyTocIdsToHtml, extractToc } from "@/lib/markdown/toc";
import { embedLocalImages } from "@/lib/markdown/embedImages";

export type ExportTheme = "night" | "print";

const PRINT_BODY_CSS = `
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #222;
  font-family: "Segoe UI", "Helvetica Neue", Helvetica, Arial, "PingFang SC",
    "Microsoft YaHei", sans-serif;
  font-size: 11pt;
  line-height: 1.65;
}
.markdown-preview {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 28px 40px;
  color: #222;
}
.markdown-preview h1, .markdown-preview h2, .markdown-preview h3,
.markdown-preview h4, .markdown-preview h5, .markdown-preview h6 {
  color: #111;
  page-break-after: avoid;
}
.markdown-preview a { color: #0645ad; }
.markdown-preview pre, .markdown-preview :not(pre) > code {
  background: #f4f4f5;
  color: #222;
}
.markdown-preview pre {
  padding: 12px 14px;
  border-radius: 4px;
  overflow: auto;
  page-break-inside: avoid;
}
.markdown-preview blockquote {
  color: #555;
  border-left: 3px solid #ccc;
  margin: 0;
  padding-left: 1em;
}
.markdown-preview th, .markdown-preview td, .markdown-preview hr {
  border-color: #ccc;
}
.markdown-preview table { page-break-inside: avoid; }
.markdown-preview img {
  max-width: 100%;
  height: auto;
  page-break-inside: avoid;
}
.markdown-preview .mermaid-block {
  background: #fff;
  padding: 8px 0;
  text-align: center;
  page-break-inside: avoid;
}
.markdown-preview .mermaid-block svg { max-width: 100%; height: auto; }
.markdown-preview .mermaid-block .nodeLabel,
.markdown-preview .mermaid-block .edgeLabel,
.markdown-preview .mermaid-block .label,
.markdown-preview .mermaid-block foreignObject,
.markdown-preview .mermaid-block foreignObject div,
.markdown-preview .mermaid-block foreignObject span,
.markdown-preview .mermaid-block foreignObject p {
  color: #222 !important;
  fill: #222 !important;
}
.markdown-preview .mermaid-block text { fill: #222 !important; }
.markdown-preview .mermaid-block .node rect,
.markdown-preview .mermaid-block .node polygon,
.markdown-preview .mermaid-block .node circle {
  fill: #f7f7f7 !important;
  stroke: #444 !important;
}
.markdown-preview .mermaid-block .edgePath path,
.markdown-preview .mermaid-block path.path {
  stroke: #444 !important;
}
.markdown-preview .front-matter {
  background: #f4f4f5;
  color: #444;
  padding: 10px 12px;
  font-size: 0.85em;
  white-space: pre-wrap;
}
@media print {
  .markdown-preview { max-width: none; padding: 0; }
}
`;

export async function buildExportHtml(
  source: string,
  title: string,
  docPath: string | null = null,
  theme: ExportTheme = "night",
): Promise<string> {
  const toc = extractToc(source);
  const { html: rendered } = await renderMarkdown(source);
  const withIds = applyTocIdsToHtml(rendered, toc);
  const html = await embedLocalImages(withIds, docPath);
  const safeTitle = escapeHtml(title.replace(/\.md$/i, "") || "Lunark");

  const styles =
    theme === "print"
      ? `${katexCss}\n${PRINT_BODY_CSS}`
      : `${nightCss}\n${nightPreviewCss}\n${katexCss}
html, body {
  margin: 0;
  padding: 0;
  background: var(--bg-color);
  color: var(--text-color);
}`;

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${theme === "print" ? "print" : "night"}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeTitle}</title>
<style>
${styles}
</style>
</head>
<body>
<article class="markdown-preview">
${html}
</article>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Typst 失败时的兜底：系统打印对话框。
 */
export async function printHtmlAsPdf(
  fullHtml: string,
  title: string,
): Promise<void> {
  const frame = document.createElement("iframe");
  frame.setAttribute("title", title);
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    document.body.removeChild(frame);
    throw new Error("无法创建打印文档");
  }

  doc.open();
  doc.write(fullHtml);
  doc.close();

  await new Promise((r) => setTimeout(r, 800));

  try {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  } finally {
    setTimeout(() => frame.parentNode?.removeChild(frame), 1000);
  }
}
