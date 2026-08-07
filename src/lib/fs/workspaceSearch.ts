import { readTextFile } from "@tauri-apps/plugin-fs";
import { fileBasename, requireTauri } from "@/lib/fs/documentIo";
import type { TreeNode } from "@/lib/fs/workspaceIo";

export interface WorkspaceSearchHit {
  path: string;
  name: string;
  /** 1-based */
  line: number;
  /** 0-based column in line */
  column: number;
  preview: string;
}

export interface WorkspaceSearchOptions {
  caseSensitive?: boolean;
  /** 总命中上限 */
  maxHits?: number;
  /** 单文件命中上限 */
  maxPerFile?: number;
}

const DEFAULT_MAX_HITS = 200;
const DEFAULT_MAX_PER_FILE = 20;

export function collectMarkdownPaths(nodes: TreeNode[]): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    if (node.kind === "file") out.push(node.path);
    else out.push(...collectMarkdownPaths(node.children));
  }
  return out;
}

function clipPreview(line: string, col: number, needleLen: number): string {
  const max = 96;
  const start = Math.max(0, col - 24);
  let slice = line.slice(start, start + max);
  if (start > 0) slice = "…" + slice;
  if (start + max < line.length) slice = slice + "…";
  // 保证命中片段可见
  void needleLen;
  return slice.trimEnd();
}

/** 在已打开工作区的 md 树中搜索文本（按行） */
export async function searchWorkspaceMarkdown(
  tree: TreeNode[],
  query: string,
  opts: WorkspaceSearchOptions = {},
): Promise<WorkspaceSearchHit[]> {
  requireTauri();
  const needle = query.trim();
  if (!needle) return [];

  const caseSensitive = opts.caseSensitive === true;
  const maxHits = opts.maxHits ?? DEFAULT_MAX_HITS;
  const maxPerFile = opts.maxPerFile ?? DEFAULT_MAX_PER_FILE;
  const paths = collectMarkdownPaths(tree);
  const hits: WorkspaceSearchHit[] = [];
  const needleCmp = caseSensitive ? needle : needle.toLowerCase();

  for (const path of paths) {
    if (hits.length >= maxHits) break;
    let text: string;
    try {
      text = await readTextFile(path);
    } catch {
      continue;
    }

    const lines = text.split(/\r\n|\r|\n/);
    let fileHits = 0;
    for (let i = 0; i < lines.length; i++) {
      if (hits.length >= maxHits || fileHits >= maxPerFile) break;
      const line = lines[i]!;
      const hay = caseSensitive ? line : line.toLowerCase();
      let from = 0;
      while (fileHits < maxPerFile && hits.length < maxHits) {
        const idx = hay.indexOf(needleCmp, from);
        if (idx < 0) break;
        hits.push({
          path,
          name: fileBasename(path),
          line: i + 1,
          column: idx,
          preview: clipPreview(line, idx, needle.length),
        });
        fileHits += 1;
        from = idx + Math.max(needle.length, 1);
      }
    }
  }

  return hits;
}
