import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import type { WindowGeometry } from "@/lib/prefs/store";

/** 读取当前窗口 inner 尺寸与位置（逻辑像素；与 setSize 一致） */
export async function readCurrentWindowGeometry(): Promise<WindowGeometry | null> {
  if (!isTauri()) return null;
  try {
    const win = getCurrentWindow();
    const size = await win.innerSize();
    const pos = await win.outerPosition();
    const factor = await win.scaleFactor();
    return {
      width: Math.round(size.width / factor),
      height: Math.round(size.height / factor),
      x: Math.round(pos.x / factor),
      y: Math.round(pos.y / factor),
    };
  } catch {
    return null;
  }
}
