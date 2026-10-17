import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";

/** 自定义标题栏开 → 关掉系统边框；关 → 恢复系统装饰 */
export async function applyCustomTitlebar(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  try {
    await getCurrentWindow().setDecorations(!enabled);
    document.documentElement.dataset.customTitlebar = enabled ? "1" : "0";
  } catch (e) {
    console.warn("[lunark] setDecorations", e);
  }
}
