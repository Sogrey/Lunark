import { Store } from "@tauri-apps/plugin-store";
import { isTauri } from "@tauri-apps/api/core";
import type { ViewMode } from "@/stores/editor";
import type { SidebarPanel } from "@/stores/workspace";
import type { RecentFileEntry } from "@/stores/session";
import { DEFAULT_THEME_ID, isThemeId, type ThemeId } from "@/lib/theme/catalog";
import {
  detectLocale,
  isLocaleId,
  type LocaleId,
} from "@/lib/i18n";

export type { RecentFileEntry };
export type { LocaleId };

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
  /** 内置主题 id，或 custom:<slug> */
  themeId: ThemeId;
  /** UI / 原生菜单语言 */
  locale: LocaleId;
  lastWorkspacePath: string | null;
  /** 有磁盘路径的打开标签（顺序） */
  sessionTabPaths: string[];
  sessionActivePath: string | null;
  /**
   * 已关闭过 Welcome 介绍页的应用版本号。
   * 与当前 version 不同（含首次 null）时再展示一次。
   */
  welcomeSeenVersion: string | null;
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
  locale: detectLocale(),
  lastWorkspacePath: null,
  sessionTabPaths: [],
  sessionActivePath: null,
  welcomeSeenVersion: null,
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

/** 白名单回填（可单测）；忽略旧版多余键 */
export function normalizePrefs(raw: unknown): AppPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFS };
  const p = raw as Partial<AppPrefs>;
  return {
    ...DEFAULT_PREFS,
    splitRatio:
      typeof p.splitRatio === "number"
        ? Math.min(0.8, Math.max(0.2, p.splitRatio))
        : DEFAULT_PREFS.splitRatio,
    viewMode:
      p.viewMode === "source" ||
      p.viewMode === "split" ||
      p.viewMode === "hybrid"
        ? p.viewMode
        : "hybrid",
    sidebarVisible:
      typeof p.sidebarVisible === "boolean"
        ? p.sidebarVisible
        : DEFAULT_PREFS.sidebarVisible,
    sidebarPanel:
      p.sidebarPanel === "outline" || p.sidebarPanel === "search"
        ? p.sidebarPanel
        : "files",
    scrollSyncEnabled:
      typeof p.scrollSyncEnabled === "boolean"
        ? p.scrollSyncEnabled
        : DEFAULT_PREFS.scrollSyncEnabled,
    focusMode: p.focusMode === true,
    typewriterMode: p.typewriterMode === true,
    statusBarVisible: p.statusBarVisible !== false,
    themeId: isThemeId(p.themeId) ? (p.themeId as ThemeId) : DEFAULT_THEME_ID,
    locale: isLocaleId(p.locale) ? p.locale : detectLocale(),
    lastWorkspacePath:
      typeof p.lastWorkspacePath === "string" ? p.lastWorkspacePath : null,
    sessionTabPaths: parsePathList(p.sessionTabPaths),
    sessionActivePath:
      typeof p.sessionActivePath === "string" ? p.sessionActivePath : null,
    welcomeSeenVersion:
      typeof p.welcomeSeenVersion === "string" && p.welcomeSeenVersion
        ? p.welcomeSeenVersion
        : null,
    recentFiles: parseRecent(p.recentFiles),
    window: parseWindow(p.window),
  };
}

export async function loadPrefs(): Promise<AppPrefs> {
  const store = await getStore();
  if (!store) return { ...DEFAULT_PREFS };

  try {
    const raw = await store.get<Partial<AppPrefs>>("prefs");
    return normalizePrefs(raw);
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
