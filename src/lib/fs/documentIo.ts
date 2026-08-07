import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "@tauri-apps/api/core";

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

export function ensureMdExtension(path: string): string {
  if (/\.(md|markdown|mdown|mkd)$/i.test(path)) return path;
  return `${path}.md`;
}

export function requireTauri(): void {
  if (!isTauri()) {
    throw new Error("文件操作需在 Tauri 桌面环境中运行（pnpm tauri:dev）");
  }
}

export async function pickOpenMarkdown(): Promise<string | null> {
  requireTauri();
  const selected = await open({
    multiple: false,
    directory: false,
    title: "打开 Markdown",
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
    title: "保存 Markdown",
    defaultPath: defaultPath ?? "untitled.md",
    filters: MD_FILTERS,
  });
  return path;
}

export async function pickSaveHtml(
  defaultPath?: string | null,
): Promise<string | null> {
  requireTauri();
  return await save({
    title: "导出 HTML",
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
    title: "导出 PDF",
    defaultPath: defaultPath ?? "export.pdf",
    filters: [
      { name: "PDF", extensions: ["pdf"] },
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
