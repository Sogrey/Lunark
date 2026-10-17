/**
 * 文档快照链：保存在应用配置目录 snapshots/ 下。
 * 触发：手动保存、定时（由调用方）。
 */

import { isTauri } from "@tauri-apps/api/core";
import { appConfigDir, join } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { grantUserPath } from "@/lib/fs/scope";

export interface SnapshotMeta {
  id: string;
  at: number;
  bytes: number;
  label: string;
}

const MAX_PER_DOC = 30;

function slugPath(filePath: string): string {
  let h = 2166136261;
  const s = filePath.replace(/\\/g, "/").toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const base = s.split("/").pop()?.replace(/[^\w.-]+/g, "_") || "doc";
  return `${base}-${(h >>> 0).toString(16)}`;
}

async function docDir(filePath: string): Promise<string> {
  const root = await appConfigDir();
  const dir = await join(root, "snapshots", slugPath(filePath));
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
  await grantUserPath(dir);
  return dir;
}

export async function writeSnapshot(
  filePath: string,
  content: string,
  label = "auto",
): Promise<SnapshotMeta | null> {
  if (!isTauri() || !filePath) return null;
  const dir = await docDir(filePath);
  const at = Date.now();
  const id = `${at}.md`;
  const path = await join(dir, id);
  await writeTextFile(path, content);
  const meta: SnapshotMeta = {
    id,
    at,
    bytes: new TextEncoder().encode(content).length,
    label,
  };
  await pruneOld(dir);
  return meta;
}

async function pruneOld(dir: string) {
  const entries = await readDir(dir);
  const files = entries
    .filter((e) => e.isFile && e.name?.endsWith(".md"))
    .map((e) => e.name!)
    .sort()
    .reverse();
  for (const name of files.slice(MAX_PER_DOC)) {
    try {
      await remove(await join(dir, name));
    } catch {
      /* ignore */
    }
  }
}

export async function listSnapshots(
  filePath: string,
): Promise<SnapshotMeta[]> {
  if (!isTauri() || !filePath) return [];
  try {
    const dir = await docDir(filePath);
    const entries = await readDir(dir);
    const out: SnapshotMeta[] = [];
    for (const e of entries) {
      if (!e.isFile || !e.name?.endsWith(".md")) continue;
      const at = Number(e.name.replace(/\.md$/, ""));
      if (!Number.isFinite(at)) continue;
      out.push({
        id: e.name,
        at,
        bytes: 0,
        label: "auto",
      });
    }
    return out.sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

export async function readSnapshot(
  filePath: string,
  id: string,
): Promise<string> {
  const dir = await docDir(filePath);
  const path = await join(dir, id);
  await grantUserPath(path);
  return readTextFile(path);
}
