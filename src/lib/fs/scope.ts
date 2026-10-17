import { invoke, isTauri } from "@tauri-apps/api/core";

/** 把用户选中的绝对路径加入本次进程的文件范围（主目录之外的盘符 / 工作区）。 */
export async function grantUserPath(
  path: string | null | undefined,
): Promise<void> {
  if (!isTauri() || !path?.trim()) return;
  await invoke("grant_user_path", { path });
}
