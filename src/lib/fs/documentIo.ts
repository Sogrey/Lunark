import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "@tauri-apps/api/core";
import { t } from "@/lib/i18n";

const MD_FILTERS = [
  {
    name: "Markdown",
    extensions: ["md", "markdown", "mdown", "mkd"],
  },
  { name: "All", extensions: ["*"] },
];

export function fileBasename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || path;
}

const MD_EXT = /\.(md|markdown|mdown|mkd)$/i;

export function isMarkdownPath(path: string): boolean {
  return MD_EXT.test(path);
}

export function ensureMdExtension(path: string): string {
  if (isMarkdownPath(path)) return path;
  return `${path}.md`;
}

/** 去掉常见行内 Markdown，便于做文件名 */
function stripInlineMarkdown(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]+/g, "")
    .trim();
}

/** Windows / 跨平台安全的文档名（不含扩展名） */
export function sanitizeDocBaseName(name: string, maxLen = 80): string {
  let base = name
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/[\s\u3000]+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  // 按码点截断，避免把中文截断成半个代理对
  base = Array.from(base).slice(0, maxLen).join("").replace(/[. ]+$/g, "");
  return base;
}

function firstHeadingTitle(md: string): string | null {
  const atx = /^(#{1,6})\s+(.+?)\s*#*\s*$/m.exec(md);
  if (atx?.[2]) return stripInlineMarkdown(atx[2]);
  const setext = /^(.+)\n(=+|-+)\s*$/m.exec(md);
  if (setext?.[1]) return stripInlineMarkdown(setext[1]);
  return null;
}

/** 第一句前 n 个字（无句号则取首段） */
function firstSentenceSnippet(md: string, n: number): string | null {
  const lines = md.split("\n");
  let body = "";
  let inFence = false;
  for (const line of lines) {
    const raw = line.trim();
    if (/^```/.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !raw) continue;
    if (/^#{1,6}\s/.test(raw)) continue;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(raw)) continue;
    body = stripInlineMarkdown(raw);
    if (body) break;
  }
  if (!body) return null;
  const sentence = body.split(/[。！？.!?；;]/)[0] ?? body;
  const snippet = Array.from(sentence.trim()).slice(0, n).join("");
  return snippet || null;
}

/**
 * 根据正文建议保存文件名：优先一级出现的标题，否则首句前 10 字。
 */
export function suggestMarkdownFileName(content: string): string {
  const text = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const raw =
    firstHeadingTitle(text) ?? firstSentenceSnippet(text, 10) ?? "Untitled";
  const base = sanitizeDocBaseName(raw) || "Untitled";
  return `${base}.md`;
}

/** 另存为默认路径：已有磁盘路径优先；Untitled 则按正文生成 */
export function defaultSaveMarkdownPath(
  filePath: string | null,
  fileName: string,
  content: string,
): string {
  if (filePath) return filePath;
  if (fileName && !/^untitled(\.md)?$/i.test(fileName)) return fileName;
  return suggestMarkdownFileName(content);
}

export function requireTauri(): void {
  if (!isTauri()) {
    throw new Error(t("msg.needTauri"));
  }
}

export async function pickOpenMarkdown(): Promise<string | null> {
  requireTauri();
  const selected = await open({
    multiple: false,
    directory: false,
    title: t("msg.dialogOpenMd"),
    filters: MD_FILTERS,
  });
  if (selected === null) return null;
  return typeof selected === "string" ? selected : selected[0] ?? null;
}

export async function pickSaveMarkdown(
  defaultPath?: string | null,
): Promise<string | null> {
  requireTauri();
  const path = await save({
    title: t("msg.dialogSaveMd"),
    defaultPath: defaultPath ?? "Untitled.md",
    filters: MD_FILTERS,
  });
  return path;
}

export async function pickSaveHtml(
  defaultPath?: string | null,
): Promise<string | null> {
  requireTauri();
  return await save({
    title: t("msg.dialogExportHtml"),
    defaultPath: defaultPath ?? "export.html",
    filters: [
      { name: "HTML", extensions: ["html", "htm"] },
      { name: "All", extensions: ["*"] },
    ],
  });
}

export async function pickSavePdf(
  defaultPath?: string | null,
): Promise<string | null> {
  requireTauri();
  return await save({
    title: t("msg.dialogExportPdf"),
    defaultPath: defaultPath ?? "export.pdf",
    filters: [
      { name: "PDF", extensions: ["pdf"] },
      { name: "All", extensions: ["*"] },
    ],
  });
}

export async function pickSavePng(
  defaultPath?: string | null,
): Promise<string | null> {
  requireTauri();
  return await save({
    title: t("msg.dialogExportImage"),
    defaultPath: defaultPath ?? "export.png",
    filters: [
      { name: "PNG", extensions: ["png"] },
      { name: "All", extensions: ["*"] },
    ],
  });
}

export async function pickSaveDocx(
  defaultPath?: string | null,
): Promise<string | null> {
  requireTauri();
  return await save({
    title: t("msg.dialogExportWord"),
    defaultPath: defaultPath ?? "export.doc",
    filters: [
      { name: "Word", extensions: ["doc"] },
      { name: "All", extensions: ["*"] },
    ],
  });
}

export async function readMarkdownFile(path: string): Promise<string> {
  requireTauri();
  return await readTextFile(path);
}

export async function writeMarkdownFile(
  path: string,
  content: string,
): Promise<void> {
  requireTauri();
  await writeTextFile(path, content);
}

export async function writeTextFileAt(
  path: string,
  content: string,
): Promise<void> {
  requireTauri();
  await writeTextFile(path, content);
}

export async function writeBinaryFileAt(
  path: string,
  data: Uint8Array,
): Promise<void> {
  requireTauri();
  await writeFile(path, data);
}
