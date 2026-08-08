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

export function ensureMdExtension(path: string): string {
  if (/\.(md|markdown|mdown|mkd)$/i.test(path)) return path;
  return `${path}.md`;
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
