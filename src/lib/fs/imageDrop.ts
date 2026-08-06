import { isTauri } from "@tauri-apps/api/core";
import { dirname, join } from "@tauri-apps/api/path";
import { exists, mkdir, writeFile } from "@tauri-apps/plugin-fs";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
}

function uniqueName(desired: string, used: Set<string>): string {
  if (!used.has(desired.toLowerCase())) {
    used.add(desired.toLowerCase());
    return desired;
  }
  const dot = desired.lastIndexOf(".");
  const base = dot > 0 ? desired.slice(0, dot) : desired;
  const ext = dot > 0 ? desired.slice(dot) : "";
  let i = 1;
  while (used.has(`${base}-${i}${ext}`.toLowerCase())) i += 1;
  const next = `${base}-${i}${ext}`;
  used.add(next.toLowerCase());
  return next;
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
}

/**
 * 将拖入的图片写入文档旁 `assets/`，返回可插入的 Markdown 片段。
 * 要求文档已保存到磁盘（有绝对路径）。
 */
export async function saveDroppedImages(
  files: FileList | File[],
  docPath: string,
): Promise<string[]> {
  if (!isTauri()) {
    throw new Error("拖拽图片需在 Tauri 桌面环境中运行");
  }

  const docDir = await dirname(docPath);
  const assetsDir = await join(docDir, "assets");
  if (!(await exists(assetsDir))) {
    await mkdir(assetsDir, { recursive: true });
  }

  const used = new Set<string>();
  const snippets: string[] = [];
  const list = Array.from(files).filter(isImageFile);

  for (const file of list) {
    const name = uniqueName(sanitizeFileName(file.name || "image.png"), used);
    const dest = await join(assetsDir, name);
    const buffer = new Uint8Array(await file.arrayBuffer());
    await writeFile(dest, buffer);
    const alt = name.replace(/\.[^.]+$/, "");
    snippets.push(`![${alt}](./assets/${name})`);
  }

  return snippets;
}
