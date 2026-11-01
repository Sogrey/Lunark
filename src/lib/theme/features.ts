/**
 * 主题包可选预览能力声明（`/* lunark-features: … *\/`）。
 * 仅作约定与 DOM 标记；不强制改用户 prefs。
 */

export const THEME_FEATURES = [
  "tip",
  "line-numbers",
  "highlight-lines",
  "containers",
  "task-list",
  "footnotes",
] as const;

export type ThemeFeature = (typeof THEME_FEATURES)[number];

const FEATURE_SET = new Set<string>(THEME_FEATURES);

/** 解析逗号 / 空白分隔的 feature 列表；未知项丢弃 */
export function parseThemeFeatures(raw: string | undefined | null): ThemeFeature[] {
  if (!raw?.trim()) return [];
  const seen = new Set<ThemeFeature>();
  for (const part of raw.split(/[\s,|]+/)) {
    const key = part.trim().toLowerCase();
    if (!key) continue;
    if (FEATURE_SET.has(key)) seen.add(key as ThemeFeature);
  }
  return THEME_FEATURES.filter((f) => seen.has(f));
}

/** 写入 / 清除 `<html data-lunark-features="…">` */
export function applyThemeFeaturesToDom(features: readonly ThemeFeature[]) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (features.length === 0) {
    root.removeAttribute("data-lunark-features");
  } else {
    root.setAttribute("data-lunark-features", features.join(" "));
  }
}

export function themeHasFeature(
  features: readonly ThemeFeature[] | undefined,
  feature: ThemeFeature,
): boolean {
  return !!features?.includes(feature);
}
