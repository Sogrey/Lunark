/** 内置 + 自定义主题目录 */

export type BuiltinThemeId =
  | "github"
  | "newsprint"
  | "night"
  | "pixyll"
  | "whitey";

/** 内置 id，或 `custom:<slug>` */
export type ThemeId = BuiltinThemeId | (string & {});

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  dark: boolean;
  custom?: boolean;
}

export interface CustomThemeEntry {
  /** custom:<slug> */
  id: string;
  label: string;
  /** 配置目录 themes/ 下文件名 */
  fileName: string;
  dark: boolean;
}

export const CUSTOM_PREFIX = "custom:";

export const BUILTIN_THEMES: readonly ThemeMeta[] = [
  { id: "github", label: "Github", dark: false },
  { id: "newsprint", label: "Newsprint", dark: false },
  { id: "night", label: "Night", dark: true },
  { id: "pixyll", label: "Pixyll", dark: false },
  { id: "whitey", label: "Whitey", dark: false },
] as const;

export const DEFAULT_THEME_ID: BuiltinThemeId = "night";

export function isBuiltinThemeId(value: unknown): value is BuiltinThemeId {
  return (
    typeof value === "string" &&
    BUILTIN_THEMES.some((t) => t.id === value)
  );
}

export function isCustomThemeId(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(CUSTOM_PREFIX);
}

export function isThemeId(value: unknown): value is ThemeId {
  return isBuiltinThemeId(value) || isCustomThemeId(value);
}

export function customSlugFromId(id: string): string {
  return id.slice(CUSTOM_PREFIX.length);
}

export function customThemeId(slug: string): string {
  return `${CUSTOM_PREFIX}${slug}`;
}

export function themeMeta(
  id: ThemeId,
  customs: CustomThemeEntry[] = [],
): ThemeMeta {
  if (isBuiltinThemeId(id)) {
    return BUILTIN_THEMES.find((t) => t.id === id) ?? BUILTIN_THEMES[2]!;
  }
  const c = customs.find((t) => t.id === id);
  if (c) {
    return { id: c.id, label: c.label, dark: c.dark, custom: true };
  }
  return { id, label: customSlugFromId(id) || id, dark: true, custom: true };
}

/** 应用 data-theme；自定义主题统一为 custom，明暗用 data-theme-mode */
export function applyThemeToDom(id: ThemeId, dark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isCustomThemeId(id)) {
    root.setAttribute("data-theme", "custom");
  } else {
    root.setAttribute("data-theme", id);
  }
  root.setAttribute("data-theme-mode", dark ? "dark" : "light");
}
