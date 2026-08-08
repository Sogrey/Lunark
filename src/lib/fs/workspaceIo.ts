import { open } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { fileBasename, requireTauri } from "@/lib/fs/documentIo";
import { t } from "@/lib/i18n";

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "target",
  "dist",
  ".pnpm-store",
  ".vscode",
  ".idea",
  "src-tauri",
]);

const MD_RE = /\.(md|markdown|mdown|mkd)$/i;
const MAX_DEPTH = 8;

export type TreeNode =
  | {
      kind: "dir";
      name: string;
      path: string;
      children: TreeNode[];
    }
  | {
      kind: "file";
      name: string;
      path: string;
    };

export async function pickOpenFolder(): Promise<string | null> {
  requireTauri();
  const selected = await open({
    multiple: false,
    directory: true,
    title: t("msg.dialogOpenFolder"),
  });
  if (selected === null) return null;
  return typeof selected === "string" ? selected : selected[0] ?? null;
}

export async function buildMarkdownTree(
  root: string,
  depth = 0,
): Promise<TreeNode[]> {
  requireTauri();
  if (depth > MAX_DEPTH) return [];

  let entries;
  try {
    entries = await readDir(root);
  } catch {
    return [];
  }

  const dirs: TreeNode[] = [];
  const files: TreeNode[] = [];

  for (const entry of entries) {
    const name = entry.name;
    if (!name || name === "." || name === "..") continue;
    if (name.startsWith(".") && !MD_RE.test(name)) continue;
    if (entry.isDirectory && SKIP_DIRS.has(name)) continue;

    const fullPath = await join(root, name);

    if (entry.isDirectory) {
      const children = await buildMarkdownTree(fullPath, depth + 1);
      if (children.length > 0) {
        dirs.push({ kind: "dir", name, path: fullPath, children });
      }
    } else if (entry.isFile && MD_RE.test(name)) {
      files.push({ kind: "file", name, path: fullPath });
    }
  }

  const byName = (a: TreeNode, b: TreeNode) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  dirs.sort(byName);
  files.sort(byName);
  return [...dirs, ...files];
}

export function folderDisplayName(rootPath: string): string {
  return fileBasename(rootPath);
}
