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
 * 在 Vue 挂载前恢复窗口尺寸/位置，避免先显示默认小窗再跳变。
 * tauri.conf 建议 `visible: false`，此处恢复后再 show。
 * 存档尺寸与 setSize 一致，使用 inner 逻辑像素。
 */
export async function bootstrapWindowGeometry(): Promise<void> {
  if (!isTauri()) return;

  const win = getCurrentWindow();
  try {
    // 尽量在 show 前完成：先读 prefs，失败则仍用 conf 默认尺寸
    const prefs = await loadPrefs();
    const work = await readWorkArea();

    let geo = prefs.window;
    if (geo?.width && geo?.height) {
      geo = work ? clampGeometryToWorkArea(geo, work) : geo;
      await win.setSize(new LogicalSize(geo.width, geo.height));
      await win.setPosition(new LogicalPosition(geo.x, geo.y));
    } else if (work) {
      geo = defaultGeometryForMode(prefs.viewMode, work);
      await win.setSize(new LogicalSize(geo.width, geo.height));
      await win.setPosition(new LogicalPosition(geo.x, geo.y));
    }
  } catch (e) {
    console.warn("[lunark] bootstrap window geometry failed", e);
  } finally {
    try {
      await win.show();
      await win.setFocus();
    } catch {
      /* ignore */
    }
  }
}
