import { renderMarkdown } from "@/lib/markdown/renderer";
import { applyTocIdsToHtml, extractToc } from "@/lib/markdown/toc";
import { embedLocalImages } from "@/lib/markdown/embedImages";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const WORD_BODY_CSS = `
body {
  font-family: "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif;
  font-size: 12pt;
  line-height: 1.65;
  color: #222;
}
h1, h2, h3, h4, h5, h6 { color: #111; page-break-after: avoid; }
pre, code { font-family: Consolas, "Courier New", monospace; }
pre {
  background: #f4f4f5;
  padding: 10px 12px;
  white-space: pre-wrap;
}
blockquote {
  color: #555;
  border-left: 3px solid #ccc;
  margin: 0;
  padding-left: 1em;
}
table { border-collapse: collapse; }
th, td { border: 1px solid #ccc; padding: 6px 10px; }
img { max-width: 100%; }
`;

/**
 * Markdown → Word 可打开的 .doc（HTML Word 格式，纯浏览器可用）。
 * 不用 html-to-docx（依赖 Node events，会在 Vite/WebView 白屏）。
 */
export async function exportMarkdownToDocBytes(
  source: string,
  title: string,
  docPath: string | null,
): Promise<Uint8Array> {
  const toc = extractToc(source);
  const { html: rendered } = await renderMarkdown(source);
  const withIds = applyTocIdsToHtml(rendered, toc);
  const bodyHtml = await embedLocalImages(withIds, docPath);
  const safeTitle = escapeHtml(title.replace(/\.md$/i, "") || "Lunark");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word"
 xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>${safeTitle}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
${WORD_BODY_CSS}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  return new TextEncoder().encode(html);
}

/** @deprecated 使用 exportMarkdownToDocBytes */
export const exportMarkdownToDocxBytes = exportMarkdownToDocBytes;

export function docNameFromMd(fileName: string): string {
  const base = fileName.replace(/\.md$/i, "") || "export";
  return `${base}.doc`;
}

/** @deprecated 使用 docNameFromMd */
export function docxNameFromMd(fileName: string): string {
  return docNameFromMd(fileName);
}
