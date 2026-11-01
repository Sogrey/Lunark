import { isTauri } from "@tauri-apps/api/core";

/** 当前是否处于窗口 / 文档全屏（不落盘） */
export async function isWindowFullscreen(): Promise<boolean> {
  if (isTauri()) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return getCurrentWindow().isFullscreen();
  }
  return !!document.fullscreenElement;
}

/** 设置全屏；与 Focus / 打字机正交 */
export async function setWindowFullscreen(enabled: boolean): Promise<void> {
  if (isTauri()) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setFullscreen(enabled);
    return;
  }
  if (enabled) {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    }
  } else if (document.fullscreenElement) {
    await document.exitFullscreen?.();
  }
}

export async function toggleWindowFullscreen(): Promise<boolean> {
  const next = !(await isWindowFullscreen());
  await setWindowFullscreen(next);
  return next;
}
