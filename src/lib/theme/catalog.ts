/** 内置主题目录（对齐 Typora 常见主题名） */

export type ThemeId =
  | "github"
  | "newsprint"
  | "night"
  | "pixyll"
  | "whitey";

export interface ThemeMeta {
  id: ThemeId;
  /** 菜单显示名 */
  label: string;
  dark: boolean;
}

export const BUILTIN_THEMES: readonly ThemeMeta[] = [
  { id: "github", label: "Github", dark: false },
  { id: "newsprint", label: "Newsprint", dark: false },
  { id: "night", label: "Night", dark: true },
  { id: "pixyll", label: "Pixyll", dark: false },
  { id: "whitey", label: "Whitey", dark: false },
] as const;

export const DEFAULT_THEME_ID: ThemeId = "night";

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    BUILTIN_THEMES.some((t) => t.id === value)
  );
}

export function themeMeta(id: ThemeId): ThemeMeta {
  return BUILTIN_THEMES.find((t) => t.id === id) ?? BUILTIN_THEMES[2]!;
}

export function applyThemeToDom(id: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", id);
}
