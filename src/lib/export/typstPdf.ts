import { invoke } from "@tauri-apps/api/core";
import { dirname, join, tempDir } from "@tauri-apps/api/path";
import { mkdir, remove, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { clearMermaidCache, renderMermaidSvg } from "@/lib/markdown/mermaid";

const MERMAID_FENCE =
  /```mermaid[ \t]*\r?\n([\s\S]*?)```/gi;

/**
 * Typst/usvg 不渲染 SVG foreignObject（Mermaid htmlLabels），
 * 浏览器画布可以，故导出前优先栅格化为 PNG；失败则回退写入 SVG。
 */
async function svgToPngBytes(svg: string, scale = 2): Promise<Uint8Array> {
  const prepared = prepareSvgForRaster(svg.trim());
  const dataUrl =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(prepared);

  const img = await loadImage(dataUrl);
  const w = Math.max(1, Math.round(img.naturalWidth || img.width || 0));
  const h = Math.max(1, Math.round(img.naturalHeight || img.height || 0));
  if (w < 2 || h < 2) {
    throw new Error(`invalid svg raster size ${w}x${h}`);
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.drawImage(img, 0, 0);

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
  return new Uint8Array(await pngBlob.arrayBuffer());
}

function prepareSvgForRaster(svg: string): string {
  let out = svg;
  if (!/xmlns=/i.test(out)) {
    out = out.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const vb = out.match(
    /\bviewBox\s*=\s*["']?\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/i,
  );
  const vw = vb ? Math.ceil(Number(vb[3])) : 0;
  const vh = vb ? Math.ceil(Number(vb[4])) : 0;

  // Mermaid 常给 width="100%"，Image 会得到 0 尺寸，必须换成像素
  out = out.replace(/<svg\b([^>]*)>/i, (_m, attrs: string) => {
    let next = String(attrs)
      .replace(/\swidth\s*=\s*["'][^"']*["']/gi, "")
      .replace(/\sheight\s*=\s*["'][^"']*["']/gi, "");
    const w = vw > 0 ? vw : 800;
    const h = vh > 0 ? vh : 400;
    next += ` width="${w}" height="${h}"`;
    return `<svg${next}>`;
  });

  return out;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("SVG image load failed"));
    img.src = url;
  });
}

/**
 * 预处理 Markdown：Mermaid → 图文件，再交给 Typst 导出。
 */
export async function prepareTypstMarkdown(
  source: string,
  docPath: string | null,
): Promise<{
  markdown: string;
  resourceDir: string;
  cleanup: () => Promise<void>;
}> {
  let resourceDir: string;
  if (docPath) {
    resourceDir = await dirname(docPath);
  } else {
    resourceDir = await tempDir();
  }

  const tmpRel = `.lunark-pdf-${Date.now()}`;
  const tmpDir = await join(resourceDir, tmpRel);
  await mkdir(tmpDir, { recursive: true });

  const cleanups: string[] = [tmpDir];
  let index = 0;
  let markdown = source;

  // 避免命中预览暗色 / 旧 htmlLabels 缓存
  clearMermaidCache();

  const matches = [...source.matchAll(MERMAID_FENCE)];
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const m = matches[i]!;
    const full = m[0];
    const code = m[1] ?? "";
    const start = m.index ?? 0;
    try {
      const svg = await renderMermaidSvg(code, "light");
      if (!svg || svg.includes("mermaid-error")) {
        console.warn("[lunark] mermaid render error svg", svg?.slice(0, 200));
        markdown =
          markdown.slice(0, start) +
          `\n> Mermaid 渲染失败，已跳过\n\n` +
          markdown.slice(start + full.length);
        continue;
      }

      let replacement: string;
      try {
        const png = await svgToPngBytes(svg, 2);
        const name = `mermaid-${index}.png`;
        const abs = await join(tmpDir, name);
        await writeFile(abs, png);
        const rel = `${tmpRel}/${name}`.replace(/\\/g, "/");
        replacement = `\n![mermaid](${rel})\n\n`;
      } catch (pngErr) {
        // 栅格化失败时回退 SVG（可能仍无 foreignObject 文字，但至少不整段失败）
        console.warn("[lunark] mermaid png failed, fallback svg", pngErr);
        const name = `mermaid-${index}.svg`;
        const abs = await join(tmpDir, name);
        await writeTextFile(abs, prepareSvgForRaster(svg));
        const rel = `${tmpRel}/${name}`.replace(/\\/g, "/");
        replacement = `\n![mermaid](${rel})\n\n`;
      }

      index += 1;
      markdown =
        markdown.slice(0, start) +
        replacement +
        markdown.slice(start + full.length);
    } catch (e) {
      console.warn("[lunark] mermaid export failed", e);
      markdown =
        markdown.slice(0, start) +
        `\n> Mermaid 渲染失败，已跳过\n\n` +
        markdown.slice(start + full.length);
    }
  }

  async function cleanup() {
    for (const p of cleanups) {
      try {
        await remove(p, { recursive: true });
      } catch {
        /* ignore */
      }
    }
  }

  return { markdown, resourceDir, cleanup };
}

export async function exportMarkdownToPdfFile(
  markdown: string,
  pdfPath: string,
  resourceDir: string,
): Promise<void> {
  await invoke("markdown_to_pdf", {
    markdown,
    pdfPath,
    resourceDir,
  });
}
