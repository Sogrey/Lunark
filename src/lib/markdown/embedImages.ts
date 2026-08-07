import { readFile } from "@tauri-apps/plugin-fs";
import { dirname, isAbsolute, join } from "@tauri-apps/api/path";
import { isTauri } from "@tauri-apps/api/core";

const REMOTE_RE =
  /^(?:https?:|data:|blob:|asset:|http:\/\/asset\.localhost)/i;

function looksAbsoluteLocal(src: string): boolean {
  return (
    /^[a-zA-Z]:[\\/]/.test(src) ||
    src.startsWith("\\\\") ||
    src.startsWith("/")
  );
}

function mimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",
  };
  return map[ext] ?? "application/octet-stream";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * 导出用：把本地图片嵌成 data URI，使 HTML/PDF 自包含。
 */
export async function embedLocalImages(
  html: string,
  docPath: string | null,
): Promise<string> {
  if (!html || !isTauri() || !docPath) return html;

  let docDir: string;
  try {
    docDir = await dirname(docPath);
  } catch {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="lunark-root">${html}</div>`,
    "text/html",
  );
  const root = doc.getElementById("lunark-root");
  if (!root) return html;

  const images = root.querySelectorAll("img");
  await Promise.all(
    Array.from(images).map(async (img) => {
      const raw = img.getAttribute("src");
      if (!raw || REMOTE_RE.test(raw)) return;

      try {
        const decoded = decodeURI(raw.trim());
        const absoluteLocal =
          looksAbsoluteLocal(decoded) || (await isAbsolute(decoded));
        const absolute = absoluteLocal
          ? decoded
          : await join(docDir, decoded);
        const bytes = await readFile(absolute);
        const mime = mimeFromPath(absolute);
        img.setAttribute(
          "src",
          `data:${mime};base64,${bytesToBase64(bytes)}`,
        );
      } catch {
        /* keep original */
      }
    }),
  );

  return root.innerHTML;
}
