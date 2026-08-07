import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize, LogicalPosition } from "@tauri-apps/api/dpi";
import { isTauri } from "@tauri-apps/api/core";
import { watch, type WatchStopHandle } from "vue";
import { useEditorStore } from "@/stores/editor";
import { useTabsStore } from "@/stores/tabs";
import { useDocumentActions } from "@/composables/useDocumentActions";
import type { WindowGeometry } from "@/lib/prefs/store";

/**
 * 窗口标题同步 + 关窗未保存拦截 + 几何恢复/保存。
 */
export function useWindowLifecycle() {
  const editor = useEditorStore();
  const tabs = useTabsStore();
  const { confirmCloseWithSave } = useDocumentActions();

  let stopTitle: WatchStopHandle | null = null;
  let unlistenClose: (() => void) | null = null;
  let geoTimer: ReturnType<typeof setTimeout> | null = null;
  let onGeometrySave: ((geo: WindowGeometry) => void) | null = null;

  async function syncTitle() {
    if (!isTauri()) return;
    try {
      const title = `${editor.title} — Lunark`;
      await getCurrentWindow().setTitle(title);
    } catch {
      /* ignore */
    }
  }

  async function restoreGeometry(geo: WindowGeometry | null | undefined) {
    if (!isTauri() || !geo) return;
    try {
      const win = getCurrentWindow();
      if (geo.width && geo.height) {
        await win.setSize(new LogicalSize(geo.width, geo.height));
      }
      if (typeof geo.x === "number" && typeof geo.y === "number") {
        await win.setPosition(new LogicalPosition(geo.x, geo.y));
      }
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
      stopTitle = watch(() => editor.title, syncTitle, { immediate: true });
      return;
    }

    onGeometrySave = opts?.onGeometry ?? null;
    if (opts?.geometry) await restoreGeometry(opts.geometry);

    stopTitle = watch(() => [editor.title, tabs.activeId] as const, syncTitle, {
      immediate: true,
    });

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
