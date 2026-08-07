import { isTauri } from "@tauri-apps/api/core";
import { basename, dirname, join } from "@tauri-apps/api/path";
import { copyFile, exists, mkdir, readFile, writeFile } from "@tauri-apps/plugin-fs";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;

/** 生成 Markdown / 文件系统均安全的文件名（去空格与特殊标点，限长） */
export function sanitizeFileName(name: string): string {
  const match = name.match(/(\.[a-zA-Z0-9]{1,8})$/);
  const ext = (match?.[1] ?? ".png").toLowerCase();
  let base = match ? name.slice(0, -match[1].length) : name;

  base = base
    .normalize("NFKC")
    .replace(/[\s\u3000]+/g, "-")
    .replace(/[，。、：:；;！!？?…·．,]+/g, "-")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/[^\w\u4e00-\u9fff\-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);

  if (!base) base = "image";
  return `${base}${ext}`;
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

/** 路径分段 encode，保证 Markdown 图片语法可解析 */
export function encodeAssetPath(relPath: string): string {
  return relPath
    .split("/")
    .map((seg) => {
      if (seg === "." || seg === ".." || seg === "") return seg;
      try {
        return encodeURIComponent(decodeURIComponent(seg));
      } catch {
        return encodeURIComponent(seg);
      }
    })
    .join("/");
}

export function toMarkdownImage(alt: string, relPath: string): string {
  const safeAlt = alt.replace(/[\[\]]/g, "").slice(0, 80) || "image";
  return `![${safeAlt}](${encodeAssetPath(relPath)})`;
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
}

export function isImagePath(path: string): boolean {
  return IMAGE_EXT.test(path);
}

async function ensureAssetsDir(docPath: string): Promise<string> {
  const docDir = await dirname(docPath);
  const assetsDir = await join(docDir, "assets");
  if (!(await exists(assetsDir))) {
    await mkdir(assetsDir, { recursive: true });
  }
  return assetsDir;
}

/**
 * 将拖入/粘贴的 File 写入文档旁 `assets/`，返回 Markdown 片段。
 */
export async function saveDroppedImages(
  files: FileList | File[],
  docPath: string,
): Promise<string[]> {
  if (!isTauri()) {
    throw new Error("拖拽图片需在 Tauri 桌面环境中运行");
  }

  const assetsDir = await ensureAssetsDir(docPath);
  const used = new Set<string>();
  const snippets: string[] = [];
  const list = Array.from(files).filter(isImageFile);

  for (const file of list) {
    const name = uniqueName(sanitizeFileName(file.name || "image.png"), used);
    const dest = await join(assetsDir, name);
    const buffer = new Uint8Array(await file.arrayBuffer());
    await writeFile(dest, buffer);
    const alt = name.replace(/\.[^.]+$/, "");
    snippets.push(toMarkdownImage(alt, `./assets/${name}`));
  }

  return snippets;
}

/**
 * Tauri 原生拖放给出的绝对路径 → 复制到 assets/ 并返回 Markdown。
 */
export async function saveImagesFromPaths(
  paths: string[],
  docPath: string,
): Promise<string[]> {
  if (!isTauri()) {
    throw new Error("拖拽图片需在 Tauri 桌面环境中运行");
  }

  const assetsDir = await ensureAssetsDir(docPath);
  const used = new Set<string>();
  const snippets: string[] = [];
  const imagePaths = paths.filter(isImagePath);

  for (const src of imagePaths) {
    const rawName = await basename(src);
    const name = uniqueName(sanitizeFileName(rawName || "image.png"), used);
    const dest = await join(assetsDir, name);

    try {
      await copyFile(src, dest);
    } catch {
      // 部分路径 copy 失败时回退读写
      const bytes = await readFile(src);
      await writeFile(dest, bytes);
    }

    const alt = name.replace(/\.[^.]+$/, "");
    snippets.push(toMarkdownImage(alt, `./assets/${name}`));
  }

  return snippets;
}
