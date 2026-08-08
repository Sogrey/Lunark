/**
 * 自定义主题 CSS：读写配置目录 themes/，注入到 DOM。
 *
 * 文件头可选元数据：
 *   /* lunark-theme: 显示名 *\/
 *   /* lunark-dark: true *\/
 */
import { isTauri } from "@tauri-apps/api/core";
import { appConfigDir, basename, join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  customThemeId,
  type CustomThemeEntry,
} from "@/lib/theme/catalog";

const STYLE_EL_ID = "lunark-custom-theme-style";
const MAX_CSS_BYTES = 512 * 1024;
const LS_KEY = "lunark-custom-themes-v1";

export function slugifyThemeFileName(name: string): string {
  const base = name.replace(/\.css$/i, "").trim() || "theme";
  const slug = base
    .replace(/[^\w\u4e00-\u9fff-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "theme";
}

export function parseThemeHeader(
  css: string,
  fallbackLabel: string,
): { label: string; dark: boolean } {
  const labelMatch = css.match(/\/\*\s*lunark-theme:\s*(.+?)\s*\*\//i);
  const darkMatch = css.match(/\/\*\s*lunark-dark:\s*(true|false)\s*\*\//i);
  const label = labelMatch?.[1]?.trim() || fallbackLabel;
  let dark = true;
  if (darkMatch?.[1]) {
    dark = darkMatch[1].toLowerCase() === "true";
  } else {
    const bg = css.match(/--bg-color\s*:\s*([^;]+)/i)?.[1]?.trim() ?? "";
    if (
      /^#(?:[fF]{3}|[fF]{6}|[eE][eEfF]|[dD][dDeE])/i.test(bg) ||
      /white|fff/i.test(bg)
    ) {
      dark = false;
    }
  }
  return { label, dark };
}

/**
 * 自定义主题注入前消毒（桌面端用户自选文件，仍限制外联与历史引擎脚本钩子）。
 * 允许相对/data/asset 资源；剥离 @import 与 http(s)/protocol-relative url。
 */
export function sanitizeCss(css: string): string {
  let out = css.replace(/<\/style/gi, "<\\/style");
  // 整条 @import … ;
  out = out.replace(/@import\b[^;]*;/gi, "/* blocked @import */");
  // expression / -moz-binding（旧引擎）
  out = out.replace(/expression\s*\(/gi, "/* blocked expression */(");
  out = out.replace(/-moz-binding\s*:/gi, "/* blocked -moz-binding */:");
  // 外部 url（含协议相对 //）
  out = out.replace(
    /url\s*\(\s*(['"]?)\s*(?:https?:|\/\/)/gi,
    "url($1/* blocked external */",
  );
  return out;
}

export function injectCustomCss(css: string | null) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_EL_ID) as HTMLStyleElement | null;
  if (!css) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_EL_ID;
    document.head.appendChild(el);
  }
  el.textContent = sanitizeCss(css);
}

async function ensureThemesDir(): Promise<string> {
  const root = await appConfigDir();
  const dir = await join(root, "themes");
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

type BrowserThemeBlob = CustomThemeEntry & { css: string };

function loadBrowserThemes(): BrowserThemeBlob[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is BrowserThemeBlob =>
        !!t &&
        typeof t === "object" &&
        typeof (t as BrowserThemeBlob).id === "string" &&
        typeof (t as BrowserThemeBlob).css === "string",
    );
  } catch {
    return [];
  }
}

function saveBrowserThemes(list: BrowserThemeBlob[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 20)));
}

export async function listCustomThemes(): Promise<CustomThemeEntry[]> {
  if (!isTauri()) {
    return loadBrowserThemes().map(({ css: _c, ...rest }) => rest);
  }
  try {
    const dir = await ensureThemesDir();
    const entries = await readDir(dir);
    const out: CustomThemeEntry[] = [];
    for (const ent of entries) {
      if (!ent.name || !ent.name.toLowerCase().endsWith(".css")) continue;
      const slug = slugifyThemeFileName(ent.name);
      const path = await join(dir, ent.name);
      let css = "";
      try {
        css = await readTextFile(path);
      } catch {
        continue;
      }
      const meta = parseThemeHeader(css, slug);
      out.push({
        id: customThemeId(slug),
        label: meta.label,
        fileName: ent.name,
        dark: meta.dark,
      });
    }
    out.sort((a, b) => a.label.localeCompare(b.label, "zh"));
    return out;
  } catch (e) {
    console.warn("[lunark] listCustomThemes failed", e);
    return [];
  }
}

export async function readCustomThemeCss(
  entry: CustomThemeEntry,
): Promise<string> {
  if (!isTauri()) {
    const hit = loadBrowserThemes().find((t) => t.id === entry.id);
    if (!hit) throw new Error("自定义主题不存在");
    return hit.css;
  }
  const dir = await ensureThemesDir();
  const path = await join(dir, entry.fileName);
  return readTextFile(path);
}

export async function importCustomThemeFromPath(
  sourcePath: string,
): Promise<CustomThemeEntry> {
  const name = await basename(sourcePath);
  if (!name.toLowerCase().endsWith(".css")) {
    throw new Error("请选择 .css 文件");
  }
  const css = await readTextFile(sourcePath);
  if (new TextEncoder().encode(css).length > MAX_CSS_BYTES) {
    throw new Error("主题 CSS 超过 512KB");
  }
  const slug = slugifyThemeFileName(name);
  const meta = parseThemeHeader(css, slug);
  const fileName = `${slug}.css`;

  if (!isTauri()) {
    const id = customThemeId(slug);
    const list = loadBrowserThemes().filter((t) => t.id !== id);
    list.push({
      id,
      label: meta.label,
      fileName,
      dark: meta.dark,
      css,
    });
    saveBrowserThemes(list);
    return { id, label: meta.label, fileName, dark: meta.dark };
  }

  const dir = await ensureThemesDir();
  const dest = await join(dir, fileName);
  await writeTextFile(dest, css);
  return {
    id: customThemeId(slug),
    label: meta.label,
    fileName,
    dark: meta.dark,
  };
}

export async function pickAndImportCustomTheme(): Promise<CustomThemeEntry | null> {
  if (!isTauri()) {
    return pickBrowserFile();
  }
  const selected = await open({
    multiple: false,
    filters: [{ name: "CSS Theme", extensions: ["css"] }],
  });
  if (!selected || typeof selected !== "string") return null;
  return importCustomThemeFromPath(selected);
}

function pickBrowserFile(): Promise<CustomThemeEntry | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".css,text/css";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      if (file.size > MAX_CSS_BYTES) {
        reject(new Error("主题 CSS 超过 512KB"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const css = String(reader.result ?? "");
        const slug = slugifyThemeFileName(file.name);
        const meta = parseThemeHeader(css, slug);
        const id = customThemeId(slug);
        const fileName = `${slug}.css`;
        const list = loadBrowserThemes().filter((t) => t.id !== id);
        list.push({
          id,
          label: meta.label,
          fileName,
          dark: meta.dark,
          css,
        });
        saveBrowserThemes(list);
        resolve({ id, label: meta.label, fileName, dark: meta.dark });
      };
      reader.onerror = () => reject(new Error("读取文件失败"));
      reader.readAsText(file);
    };
    input.click();
  });
}

export async function removeCustomTheme(
  entry: CustomThemeEntry,
): Promise<void> {
  if (!isTauri()) {
    saveBrowserThemes(loadBrowserThemes().filter((t) => t.id !== entry.id));
    return;
  }
  const dir = await ensureThemesDir();
  const path = await join(dir, entry.fileName);
  if (await exists(path)) {
    await remove(path);
  }
}

export async function openThemesFolder(): Promise<void> {
  if (!isTauri()) {
    throw new Error("浏览器模式无主题文件夹，请使用「导入主题 CSS」");
  }
  const dir = await ensureThemesDir();
  const readme = await join(dir, "README.txt");
  if (!(await exists(readme))) {
    await writeTextFile(
      readme,
      [
        "Lunark 自定义主题目录",
        "",
        "将 .css 放入此文件夹，或在应用菜单「主题 → 导入主题 CSS」导入。",
        "可选文件头：",
        "  /* lunark-theme: 显示名 */",
        "  /* lunark-dark: true */",
        "",
        '样式请使用 [data-theme="custom"] 选择器覆盖 CSS 变量。',
        "示例见仓库 themes/examples/slate.css",
      ].join("\n"),
    );
  }
  await openPath(dir);
}
