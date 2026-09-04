import {
  currentMonitor,
  getCurrentWindow,
  primaryMonitor,
} from "@tauri-apps/api/window";
import { LogicalSize, LogicalPosition } from "@tauri-apps/api/dpi";
import { isTauri } from "@tauri-apps/api/core";
import { watch, type WatchStopHandle } from "vue";
import { useEditorStore } from "@/stores/editor";
import { useDocumentActions } from "@/composables/useDocumentActions";
import type { WindowGeometry } from "@/lib/prefs/store";
import {
  clampGeometryToWorkArea,
  defaultGeometryForMode,
  type WorkAreaLogical,
} from "@/lib/window/geometry";
import { readCurrentWindowGeometry } from "@/lib/window/readGeometry";

/**
 * 窗口标题同步 + 关窗未保存拦截 + 几何恢复/保存。
 * 启动几何由 bootstrapWindowGeometry 在 Vue 挂载前处理；此处负责监听变更与退出落盘。
 */
export function useWindowLifecycle() {
  const editor = useEditorStore();
  const { confirmCloseWithSave } = useDocumentActions();

  let stopTitle: WatchStopHandle | null = null;
  let unlistenClose: (() => void) | null = null;
  let geoTimer: ReturnType<typeof setTimeout> | null = null;
  let onGeometrySave: ((geo: WindowGeometry) => void) | null = null;
  let onFlushSave: ((geo: WindowGeometry | null) => Promise<void>) | null =
    null;

  async function syncTitle() {
    if (!isTauri()) {
      if (typeof document !== "undefined") {
        document.title = editor.windowTitle;
      }
      return;
    }
    try {
      await getCurrentWindow().setTitle(editor.windowTitle);
    } catch {
      /* ignore */
    }
  }

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

  async function applyGeometry(geo: WindowGeometry) {
    const win = getCurrentWindow();
    await win.setSize(new LogicalSize(geo.width, geo.height));
    if (typeof geo.x === "number" && typeof geo.y === "number") {
      await win.setPosition(new LogicalPosition(geo.x, geo.y));
    }
  }

  /**
   * 兜底：若 bootstrap 未执行，仍尝试恢复存档几何。
   */
  async function placeWindow(saved: WindowGeometry | null | undefined) {
    if (!isTauri()) return;
    try {
      const work = await readWorkArea();
      let geo: WindowGeometry;
      if (saved?.width && saved?.height) {
        geo = work
          ? clampGeometryToWorkArea(saved, work)
          : {
              width: saved.width,
              height: saved.height,
              x: saved.x,
              y: saved.y,
            };
      } else if (work) {
        geo = defaultGeometryForMode(editor.viewMode, work);
      } else {
        const d = defaultGeometryForMode(editor.viewMode, {
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
        });
        geo = d;
      }
      await applyGeometry(geo);
    } catch {
      /* ignore */
    }
  }

  function scheduleGeometryPersist() {
    if (!onGeometrySave || !isTauri()) return;
    if (geoTimer) clearTimeout(geoTimer);
    geoTimer = setTimeout(() => {
      void (async () => {
        const geo = await readCurrentWindowGeometry();
        if (geo) onGeometrySave?.(geo);
      })();
    }, 500);
  }

  async function flushGeometryPersist() {
    if (geoTimer) {
      clearTimeout(geoTimer);
      geoTimer = null;
    }
    const geo = await readCurrentWindowGeometry();
    if (geo) onGeometrySave?.(geo);
    if (onFlushSave) await onFlushSave(geo);
  }

  async function bind(opts?: {
    geometry?: WindowGeometry | null;
    skipInitialPlacement?: boolean;
    onGeometry?: (geo: WindowGeometry) => void;
    onFlushSave?: (geo: WindowGeometry | null) => Promise<void>;
  }) {
    if (!isTauri()) {
      stopTitle = watch(
        () => editor.windowTitle,
        syncTitle,
        { immediate: true },
      );
      return;
    }

    onGeometrySave = opts?.onGeometry ?? null;
    onFlushSave = opts?.onFlushSave ?? null;

    if (!opts?.skipInitialPlacement) {
      await placeWindow(opts?.geometry ?? null);
    }

    stopTitle = watch(
      () => editor.windowTitle,
      syncTitle,
      { immediate: true },
    );

    const win = getCurrentWindow();
    unlistenClose = await win.onCloseRequested(async (event) => {
      event.preventDefault();
      try {
        const ok = await confirmCloseWithSave();
        if (!ok) return;
        await flushGeometryPersist();
        await win.destroy();
      } catch (e) {
        console.warn("[lunark] closeRequested failed, force destroy", e);
        try {
          await flushGeometryPersist();
          await win.destroy();
        } catch {
          /* ignore */
        }
      }
    });

    const unResize = await win.onResized(() => scheduleGeometryPersist());
    const unMove = await win.onMoved(() => scheduleGeometryPersist());
    const prev = unlistenClose;
    unlistenClose = () => {
      prev?.();
      unResize();
      unMove();
    };
  }

  /** 启动恢复 Tab 后再套一次，避免首帧仍是 tauri.conf 默认尺寸 */
  async function restoreGeometry(saved: WindowGeometry | null | undefined) {
    await placeWindow(saved ?? null);
  }

  function dispose() {
    stopTitle?.();
    unlistenClose?.();
    if (geoTimer) clearTimeout(geoTimer);
  }

  return { bind, dispose, syncTitle, restoreGeometry };
}
