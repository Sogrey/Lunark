import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { dirname, isAbsolute, join } from "@tauri-apps/api/path";

const REMOTE_RE =
  /^(?:https?:|data:|blob:|asset:|http:\/\/asset\.localhost)/i;

function looksAbsoluteLocal(src: string): boolean {
  return (
    /^[a-zA-Z]:[\\/]/.test(src) ||
    src.startsWith("\\\\") ||
    src.startsWith("/")
  );
}

/**
 * 将预览 HTML 中的本地相对/绝对图片 src 转为 Tauri asset URL。
 * 应在 DOMPurify 之后调用（相对路径先过消毒，再换成 asset:）。
 */
export async function resolvePreviewImages(
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
        img.setAttribute("src", convertFileSrc(absolute));
      } catch {
        /* keep original src */
      }
    }),
  );

  return root.innerHTML;
}
