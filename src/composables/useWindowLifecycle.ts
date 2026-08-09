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

/**
 * 窗口标题同步 + 关窗未保存拦截 + 几何恢复/保存。
 * 首次/恢复时按显示器工作区钳制，避免底边被任务栏挡住。
 */
export function useWindowLifecycle() {
  const editor = useEditorStore();
  const { confirmCloseWithSave } = useDocumentActions();

  let stopTitle: WatchStopHandle | null = null;
  let unlistenClose: (() => void) | null = null;
  let geoTimer: ReturnType<typeof setTimeout> | null = null;
  let onGeometrySave: ((geo: WindowGeometry) => void) | null = null;

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
   * 有存档则恢复并钳进工作区；无存档则按当前视图模式给默认尺寸并居中。
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
        try {
          const win = getCurrentWindow();
          const size = await win.outerSize();
          const pos = await win.outerPosition();
          const factor = await win.scaleFactor();
          onGeometrySave?.({
            width: Math.round(size.width / factor),
            height: Math.round(size.height / factor),
            x: Math.round(pos.x / factor),
            y: Math.round(pos.y / factor),
          });
        } catch {
          /* ignore */
        }
      })();
    }, 500);
  }

  async function bind(opts?: {
    geometry?: WindowGeometry | null;
    onGeometry?: (geo: WindowGeometry) => void;
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
    await placeWindow(opts?.geometry ?? null);

    stopTitle = watch(
      () => editor.windowTitle,
      syncTitle,
      { immediate: true },
    );

    const win = getCurrentWindow();
    // Tauri 2：监听 closeRequested 后需自行 destroy（capabilities 需 allow-destroy）
    unlistenClose = await win.onCloseRequested(async (event) => {
      event.preventDefault();
      try {
        const ok = await confirmCloseWithSave();
        if (ok) await win.destroy();
      } catch (e) {
        console.warn("[lunark] closeRequested failed, force destroy", e);
        try {
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

  function dispose() {
    stopTitle?.();
    unlistenClose?.();
    if (geoTimer) clearTimeout(geoTimer);
  }

  return { bind, dispose, syncTitle };
}
