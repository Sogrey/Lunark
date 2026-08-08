import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  applyThemeToDom,
  BUILTIN_THEMES,
  DEFAULT_THEME_ID,
  isBuiltinThemeId,
  isCustomThemeId,
  isThemeId,
  themeMeta,
  type CustomThemeEntry,
  type ThemeId,
} from "@/lib/theme/catalog";
import {
  injectCustomCss,
  listCustomThemes,
  openThemesFolder,
  pickAndImportCustomTheme,
  readCustomThemeCss,
  removeCustomTheme,
} from "@/lib/theme/customCss";
import { clearMermaidCache } from "@/lib/markdown/mermaid";

export const useThemeStore = defineStore("theme", () => {
  const themeId = ref<ThemeId>(DEFAULT_THEME_ID);
  const customThemes = ref<CustomThemeEntry[]>([]);

  const meta = computed(() =>
    themeMeta(themeId.value, customThemes.value),
  );
  const isDark = computed(() => meta.value.dark);
  const mermaidMode = computed<"dark" | "light">(() =>
    isDark.value ? "dark" : "light",
  );
  const themes = BUILTIN_THEMES;
  const isCustomActive = computed(() => isCustomThemeId(themeId.value));

  async function reloadCustomThemes() {
    customThemes.value = await listCustomThemes();
  }

  async function applyActiveTheme() {
    const id = themeId.value;
    const dark = themeMeta(id, customThemes.value).dark;
    applyThemeToDom(id, dark);

    if (isCustomThemeId(id)) {
      const entry = customThemes.value.find((t) => t.id === id);
      if (!entry) {
        injectCustomCss(null);
        themeId.value = DEFAULT_THEME_ID;
        applyThemeToDom(DEFAULT_THEME_ID, true);
        return;
      }
      try {
        const css = await readCustomThemeCss(entry);
        injectCustomCss(css);
      } catch (e) {
        console.warn("[lunark] load custom theme failed", e);
        injectCustomCss(null);
        themeId.value = DEFAULT_THEME_ID;
        applyThemeToDom(DEFAULT_THEME_ID, true);
      }
    } else {
      injectCustomCss(null);
    }
    clearMermaidCache();
  }

  async function setTheme(id: ThemeId) {
    if (!isThemeId(id)) return;
    if (isCustomThemeId(id) && !customThemes.value.some((t) => t.id === id)) {
      await reloadCustomThemes();
      if (!customThemes.value.some((t) => t.id === id)) return;
    }
    themeId.value = id;
    await applyActiveTheme();
  }

  async function importTheme(): Promise<CustomThemeEntry | null> {
    const entry = await pickAndImportCustomTheme();
    if (!entry) return null;
    await reloadCustomThemes();
    await setTheme(entry.id);
    return entry;
  }

  async function removeActiveCustomTheme(): Promise<boolean> {
    if (!isCustomThemeId(themeId.value)) return false;
    const entry = customThemes.value.find((t) => t.id === themeId.value);
    if (!entry) return false;
    await removeCustomTheme(entry);
    injectCustomCss(null);
    themeId.value = DEFAULT_THEME_ID;
    await reloadCustomThemes();
    await applyActiveTheme();
    return true;
  }

  async function revealThemesFolder() {
    await openThemesFolder();
  }

  async function hydrate(id: unknown) {
    await reloadCustomThemes();
    let next: ThemeId = DEFAULT_THEME_ID;
    if (isBuiltinThemeId(id)) {
      next = id;
    } else if (isCustomThemeId(id) && customThemes.value.some((t) => t.id === id)) {
      next = id;
    }
    themeId.value = next;
    await applyActiveTheme();
  }

  return {
    themeId,
    customThemes,
    meta,
    isDark,
    mermaidMode,
    themes,
    isCustomActive,
    setTheme,
    importTheme,
    removeActiveCustomTheme,
    revealThemesFolder,
    reloadCustomThemes,
    hydrate,
  };
});
