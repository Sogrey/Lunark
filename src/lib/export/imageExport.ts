import { toPng } from "html-to-image";
import { buildExportHtml } from "@/lib/export/htmlExport";

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function waitImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images);
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  ).then(() => undefined);
}

/**
 * 将 Markdown 渲染为 PNG（白底印刷样式，适合分享）。
 */
export async function exportMarkdownToPngBytes(
  source: string,
  title: string,
  docPath: string | null,
): Promise<Uint8Array> {
  const fullHtml = await buildExportHtml(source, title, docPath, "print");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "lunark-export-image");
  iframe.style.cssText =
    "position:fixed;left:-12000px;top:0;width:820px;height:200px;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  try {
    const idoc = iframe.contentDocument;
    if (!idoc) throw new Error("无法创建导出画布");

    idoc.open();
    idoc.write(fullHtml);
    idoc.close();

    await new Promise<void>((r) => {
      if (idoc.readyState === "complete") r();
      else iframe.onload = () => r();
      setTimeout(() => r(), 50);
    });
    await waitImages(idoc);
    await new Promise((r) => setTimeout(r, 120));

    const article = idoc.querySelector(
      ".markdown-preview",
    ) as HTMLElement | null;
    if (!article) throw new Error("导出内容为空");

    const height = Math.max(article.scrollHeight, article.offsetHeight, 200);
    iframe.style.height = `${height + 40}px`;

    const dataUrl = await toPng(article, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#ffffff",
      width: article.scrollWidth || 780,
      height,
    });
    return dataUrlToBytes(dataUrl);
  } finally {
    iframe.remove();
  }
}

export function pngNameFromMd(fileName: string): string {
  const base = fileName.replace(/\.md$/i, "") || "export";
  return `${base}.png`;
}
