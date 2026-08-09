/**
 * 窗口默认尺寸与工作区（排除任务栏）钳制。
 * 逻辑像素；运行时由 useWindowLifecycle 配合 Monitor.workArea 使用。
 */
import type { ViewMode } from "@/stores/editor";
import type { WindowGeometry } from "@/lib/prefs/store";

export type WorkAreaLogical = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 混合 / 源码：偏窄；双栏：更宽（用户仍可自行改） */
export const DEFAULT_WINDOW_BY_MODE: Record<
  ViewMode,
  { width: number; height: number }
> = {
  hybrid: { width: 980, height: 700 },
  source: { width: 980, height: 700 },
  split: { width: 1280, height: 800 },
};

const MARGIN = 8;

export function defaultGeometryForMode(
  mode: ViewMode,
  work: WorkAreaLogical,
): WindowGeometry {
  const pref = DEFAULT_WINDOW_BY_MODE[mode] ?? DEFAULT_WINDOW_BY_MODE.hybrid;
  const width = Math.min(pref.width, Math.max(320, work.width - MARGIN * 2));
  const height = Math.min(pref.height, Math.max(240, work.height - MARGIN * 2));
  const x = Math.round(work.x + (work.width - width) / 2);
  const y = Math.round(work.y + (work.height - height) / 2);
  return { width: Math.round(width), height: Math.round(height), x, y };
}

/**
 * 把窗口放进工作区内，避免底边被任务栏挡住。
 * 尺寸过大时先缩小再对齐位置。
 */
export function clampGeometryToWorkArea(
  geo: WindowGeometry,
  work: WorkAreaLogical,
): WindowGeometry {
  const maxW = Math.max(320, work.width - MARGIN * 2);
  const maxH = Math.max(240, work.height - MARGIN * 2);
  const width = Math.min(Math.max(geo.width || 320, 320), maxW);
  const height = Math.min(Math.max(geo.height || 240, 240), maxH);

  const minX = work.x + MARGIN;
  const minY = work.y + MARGIN;
  const maxX = work.x + work.width - width - MARGIN;
  const maxY = work.y + work.height - height - MARGIN;

  let x = typeof geo.x === "number" ? geo.x : minX;
  let y = typeof geo.y === "number" ? geo.y : minY;
  x = Math.round(Math.min(Math.max(x, minX), Math.max(minX, maxX)));
  y = Math.round(Math.min(Math.max(y, minY), Math.max(minY, maxY)));

  return { width: Math.round(width), height: Math.round(height), x, y };
}
