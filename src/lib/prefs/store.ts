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
import {
  DEFAULT_PICGO_ENDPOINT,
} from "@/lib/fs/picgo";
import {
  createDefaultImageHosts,
  normalizeImageHosts,
  resolveActiveHost,
  type ImageHostProfile,
} from "@/lib/fs/imageHosts";
import {
  DEFAULT_OLLAMA_ENDPOINT,
  DEFAULT_OLLAMA_MODEL,
} from "@/lib/ai/ollama";
import {
  isWindowMaterial,
  type WindowMaterial,
} from "@/lib/window/material";

export type { RecentFileEntry };
export type { LocaleId };
export type { WindowMaterial };
export type { ImageHostProfile };

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
  /** 源码模式英文拼写波浪线 */
  spellCheckEnabled: boolean;
  /** 粘贴/拖图走远程图床（与 imageHosts 联动） */
  picgoEnabled: boolean;
  /** 兼容旧 prefs：等于当前 active host 的 endpoint */
  picgoEndpoint: string;
  /** 多图床配置 */
  imageHosts: ImageHostProfile[];
  activeImageHostId: string;
  /** Windows 窗口材质 */
  windowMaterial: WindowMaterial;
  /** 自绘标题栏（无系统边框） */
  customTitlebar: boolean;
  /** 本机 Ollama 助手 */
  ollamaEnabled: boolean;
  ollamaEndpoint: string;
  ollamaModel: string;
  /** 保存时写快照 */
  snapshotsEnabled: boolean;
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
  spellCheckEnabled: false,
  picgoEnabled: false,
  picgoEndpoint: DEFAULT_PICGO_ENDPOINT,
  imageHosts: createDefaultImageHosts(),
  activeImageHostId: createDefaultImageHosts()[0]!.id,
  windowMaterial: "off",
  customTitlebar: true,
  ollamaEnabled: false,
  ollamaEndpoint: DEFAULT_OLLAMA_ENDPOINT,
  ollamaModel: DEFAULT_OLLAMA_MODEL,
  snapshotsEnabled: true,
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
  if (typeof w.width !== "number" || typeof w.height !== "number") {
    return null;
  }
  if (!Number.isFinite(w.width) || !Number.isFinite(w.height)) {
    return null;
  }
  return {
    width: Math.max(640, Math.round(w.width)),
    height: Math.max(400, Math.round(w.height)),
    x: typeof w.x === "number" && Number.isFinite(w.x) ? Math.round(w.x) : 0,
    y: typeof w.y === "number" && Number.isFinite(w.y) ? Math.round(w.y) : 0,
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
      p.sidebarPanel === "outline" ||
      p.sidebarPanel === "search" ||
      p.sidebarPanel === "backlinks"
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
    spellCheckEnabled: p.spellCheckEnabled === true,
    picgoEnabled: p.picgoEnabled === true,
    picgoEndpoint:
      typeof p.picgoEndpoint === "string" && p.picgoEndpoint.trim()
        ? p.picgoEndpoint.trim()
        : DEFAULT_PICGO_ENDPOINT,
    imageHosts: (() => {
      const ep =
        typeof p.picgoEndpoint === "string" && p.picgoEndpoint.trim()
          ? p.picgoEndpoint.trim()
          : DEFAULT_PICGO_ENDPOINT;
      return normalizeImageHosts(p.imageHosts, ep);
    })(),
    activeImageHostId: (() => {
      const ep =
        typeof p.picgoEndpoint === "string" && p.picgoEndpoint.trim()
          ? p.picgoEndpoint.trim()
          : DEFAULT_PICGO_ENDPOINT;
      const hosts = normalizeImageHosts(p.imageHosts, ep);
      const id =
        typeof p.activeImageHostId === "string" && p.activeImageHostId.trim()
          ? p.activeImageHostId.trim()
          : hosts[0]?.id ?? "";
      return resolveActiveHost(hosts, id)?.id ?? hosts[0]?.id ?? "";
    })(),
    windowMaterial: isWindowMaterial(p.windowMaterial)
      ? p.windowMaterial
      : "off",
    customTitlebar: p.customTitlebar !== false,
    ollamaEnabled: p.ollamaEnabled === true,
    ollamaEndpoint:
      typeof p.ollamaEndpoint === "string" && p.ollamaEndpoint.trim()
        ? p.ollamaEndpoint.trim()
        : DEFAULT_OLLAMA_ENDPOINT,
    ollamaModel:
      typeof p.ollamaModel === "string" && p.ollamaModel.trim()
        ? p.ollamaModel.trim()
        : DEFAULT_OLLAMA_MODEL,
    snapshotsEnabled: p.snapshotsEnabled !== false,
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
