import nightCss from "@/styles/themes/night.css?raw";
import nightPreviewCss from "@/styles/themes/night-preview.css?raw";
import katexCss from "katex/dist/katex.min.css?raw";
import { renderMarkdown } from "@/lib/markdown/renderer";
import { applyTocIdsToHtml, extractToc } from "@/lib/markdown/toc";

export async function buildExportHtml(
  source: string,
  title: string,
): Promise<string> {
  const toc = extractToc(source);
  const { html: rendered } = await renderMarkdown(source);
  const html = applyTocIdsToHtml(rendered, toc);
  const safeTitle = escapeHtml(title.replace(/\.md$/i, "") || "Lunark");

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="night">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeTitle}</title>
<style>
${nightCss}
${nightPreviewCss}
${katexCss}
html, body {
  margin: 0;
  padding: 0;
  background: var(--bg-color);
  color: var(--text-color);
}
@media print {
  html, body { background: #fff; color: #222; }
  .markdown-preview { color: #222; max-width: none; }
  .markdown-preview h1, .markdown-preview h2, .markdown-preview h3,
  .markdown-preview h4, .markdown-preview h5, .markdown-preview h6,
  .markdown-preview strong { color: #111; }
  .markdown-preview a { color: #0645ad; }
  .markdown-preview pre, .markdown-preview :not(pre) > code {
    background: #f5f5f5;
    color: #222;
  }
  .markdown-preview blockquote { color: #555; border-left-color: #ccc; }
  .markdown-preview th, .markdown-preview td, .markdown-preview hr {
    border-color: #ccc;
  }
}
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

/** 打开隐藏打印窗口，系统「打印到 PDF」即可导出 PDF */
export function printHtmlAsPdf(fullHtml: string, title: string): void {
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

  const cleanup = () => {
    setTimeout(() => {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    }, 1000);
  };

  const trigger = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      cleanup();
    }
  };

  setTimeout(trigger, 400);
}
