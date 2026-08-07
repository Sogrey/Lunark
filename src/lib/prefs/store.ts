import { Store } from "@tauri-apps/plugin-store";
import { isTauri } from "@tauri-apps/api/core";
import type { ViewMode } from "@/stores/editor";
import type { SidebarPanel } from "@/stores/workspace";

const STORE_FILE = "lunark-prefs.json";

export interface WindowGeometry {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface AppPrefs {
  splitRatio: number;
  viewMode: ViewMode;
  sidebarVisible: boolean;
  sidebarPanel: SidebarPanel;
  scrollSyncEnabled: boolean;
  lastWorkspacePath: string | null;
  window: WindowGeometry | null;
}

export const DEFAULT_PREFS: AppPrefs = {
  splitRatio: 0.5,
  viewMode: "split",
  sidebarVisible: true,
  sidebarPanel: "files",
  scrollSyncEnabled: true,
  lastWorkspacePath: null,
  window: null,
};

let storePromise: Promise<Store | null> | null = null;

async function getStore(): Promise<Store | null> {
  if (!isTauri()) return null;
  if (!storePromise) {
    storePromise = Store.load(STORE_FILE).catch((e) => {
      console.warn("[lunark] prefs store unavailable", e);
      storePromise = null;
      return null;
    });
  }
  return storePromise;
}

function parseWindow(raw: unknown): WindowGeometry | null {
  if (!raw || typeof raw !== "object") return null;
  const w = raw as Partial<WindowGeometry>;
  if (
    typeof w.width !== "number" ||
    typeof w.height !== "number" ||
    typeof w.x !== "number" ||
    typeof w.y !== "number"
  ) {
    return null;
  }
  return {
    width: Math.max(640, w.width),
    height: Math.max(400, w.height),
    x: w.x,
    y: w.y,
  };
}

export async function loadPrefs(): Promise<AppPrefs> {
  const store = await getStore();
  if (!store) return { ...DEFAULT_PREFS };

  try {
    const raw = await store.get<Partial<AppPrefs>>("prefs");
    if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFS };
    return {
      ...DEFAULT_PREFS,
      ...raw,
      splitRatio:
        typeof raw.splitRatio === "number"
          ? Math.min(0.8, Math.max(0.2, raw.splitRatio))
          : DEFAULT_PREFS.splitRatio,
      viewMode: raw.viewMode === "source" ? "source" : "split",
      sidebarPanel: raw.sidebarPanel === "outline" ? "outline" : "files",
      lastWorkspacePath:
        typeof raw.lastWorkspacePath === "string"
          ? raw.lastWorkspacePath
          : null,
      window: parseWindow(raw.window),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function savePrefs(prefs: AppPrefs): Promise<void> {
  const store = await getStore();
  if (!store) return;
  try {
    await store.set("prefs", prefs);
    await store.save();
  } catch (e) {
    console.warn("[lunark] failed to save prefs", e);
  }
}
