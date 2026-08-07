import { Store } from "@tauri-apps/plugin-store";
import { isTauri } from "@tauri-apps/api/core";
import type { ViewMode } from "@/stores/editor";
import type { SidebarPanel } from "@/stores/workspace";
import type { RecentFileEntry } from "@/stores/session";
import { DEFAULT_THEME_ID, isThemeId, type ThemeId } from "@/lib/theme/catalog";

export type { RecentFileEntry };

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
  focusMode: boolean;
  typewriterMode: boolean;
  statusBarVisible: boolean;
  /** 内置主题 id */
  themeId: ThemeId;
  lastWorkspacePath: string | null;
  /** 有磁盘路径的打开标签（顺序） */
  sessionTabPaths: string[];
  sessionActivePath: string | null;
  recentFiles: RecentFileEntry[];
  window: WindowGeometry | null;
}

export const DEFAULT_PREFS: AppPrefs = {
  splitRatio: 0.5,
  viewMode: "hybrid",
  sidebarVisible: true,
  sidebarPanel: "files",
  scrollSyncEnabled: true,
  focusMode: false,
  typewriterMode: false,
  statusBarVisible: true,
  themeId: DEFAULT_THEME_ID,
  lastWorkspacePath: null,
  sessionTabPaths: [],
  sessionActivePath: null,
  recentFiles: [],
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

function parseRecent(raw: unknown): RecentFileEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: RecentFileEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Partial<RecentFileEntry>;
    if (typeof r.path !== "string" || !r.path) continue;
    out.push({
      path: r.path,
      name: typeof r.name === "string" ? r.name : r.path.split(/[/\\]/).pop() ?? r.path,
      openedAt: typeof r.openedAt === "number" ? r.openedAt : 0,
    });
    if (out.length >= 12) break;
  }
  return out;
}

function parsePathList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const p of raw) {
    if (typeof p === "string" && p) out.push(p);
    if (out.length >= 20) break;
  }
  return out;
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
      viewMode:
        raw.viewMode === "source" || raw.viewMode === "split"
          ? raw.viewMode
          : "hybrid",
      sidebarPanel:
        raw.sidebarPanel === "outline" || raw.sidebarPanel === "search"
          ? raw.sidebarPanel
          : "files",
      focusMode: raw.focusMode === true,
      typewriterMode: raw.typewriterMode === true,
      statusBarVisible: raw.statusBarVisible !== false,
      themeId: isThemeId(raw.themeId) ? raw.themeId : DEFAULT_THEME_ID,
      lastWorkspacePath:
        typeof raw.lastWorkspacePath === "string"
          ? raw.lastWorkspacePath
          : null,
      sessionTabPaths: parsePathList(raw.sessionTabPaths),
      sessionActivePath:
        typeof raw.sessionActivePath === "string"
          ? raw.sessionActivePath
          : null,
      recentFiles: parseRecent(raw.recentFiles),
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
