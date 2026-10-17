import { isTauri } from "@tauri-apps/api/core";
import {
  currentMonitor,
  getCurrentWindow,
  primaryMonitor,
} from "@tauri-apps/api/window";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { loadPrefs } from "@/lib/prefs/store";
import {
  clampGeometryToWorkArea,
  defaultGeometryForMode,
  type WorkAreaLogical,
} from "@/lib/window/geometry";

async function readWorkArea(): Promise<WorkAreaLogical | null> {
  try {
    const monitor = (await currentMonitor()) ?? (await primaryMonitor());
    if (!monitor) return null;
    const f = monitor.scaleFactor || 1;
    return {
      x: monitor.workArea.position.x / f,
      y: monitor.workArea.position.y / f,
      width: monitor.workArea.size.width / f,
      height: monitor.workArea.size.height / f,
    };
  } catch {
    return null;
  }
}

/**
 * 在 Vue 挂载前恢复窗口尺寸/位置。
 * **不**在此 show：等 AppShell 应用标题栏/材质后再显示，避免小窗→大窗跳变。
 * Rust setup 已尽量提前恢复；此处用 prefs + 工作区钳制再校正一次。
 */
export async function bootstrapWindowGeometry(): Promise<void> {
  if (!isTauri()) return;

  const win = getCurrentWindow();
  try {
    const prefs = await loadPrefs();
    const work = await readWorkArea();

    let geo = prefs.window;
    if (geo?.width && geo?.height) {
      geo = work ? clampGeometryToWorkArea(geo, work) : geo;
      await win.setSize(new LogicalSize(geo.width, geo.height));
      if (typeof geo.x === "number" && typeof geo.y === "number") {
        await win.setPosition(new LogicalPosition(geo.x, geo.y));
      }
    } else if (work) {
      geo = defaultGeometryForMode(prefs.viewMode, work);
      await win.setSize(new LogicalSize(geo.width, geo.height));
      await win.setPosition(new LogicalPosition(geo.x, geo.y));
    }
  } catch (e) {
    console.warn("[lunark] bootstrap window geometry failed", e);
  }
}

/** 尺寸与壳层就绪后首次显示窗口 */
export async function showMainWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    const win = getCurrentWindow();
    await win.show();
    await win.setFocus();
  } catch (e) {
    console.warn("[lunark] showMainWindow failed", e);
  }
}
