import { invoke, isTauri } from "@tauri-apps/api/core";

export interface GitCommitEntry {
  hash: string;
  shortHash: string;
  author: string;
  at: number;
  subject: string;
}

export async function fetchGitFileLog(
  filePath: string,
  limit = 40,
): Promise<GitCommitEntry[]> {
  if (!isTauri()) return [];
  return invoke<GitCommitEntry[]>("git_file_log", { filePath, limit });
}

export async function fetchGitFileAtCommit(
  filePath: string,
  commit: string,
): Promise<string> {
  if (!isTauri()) throw new Error("need tauri");
  return invoke<string>("git_show_file", { filePath, commit });
}
