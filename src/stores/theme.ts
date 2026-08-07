import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  applyThemeToDom,
  BUILTIN_THEMES,
  DEFAULT_THEME_ID,
  isThemeId,
  themeMeta,
  type ThemeId,
} from "@/lib/theme/catalog";
import { clearMermaidCache } from "@/lib/markdown/mermaid";

export const useThemeStore = defineStore("theme", () => {
  const themeId = ref<ThemeId>(DEFAULT_THEME_ID);

  const meta = computed(() => themeMeta(themeId.value));
  const isDark = computed(() => meta.value.dark);
  const mermaidMode = computed<"dark" | "light">(() =>
    isDark.value ? "dark" : "light",
  );
  const themes = BUILTIN_THEMES;

  function setTheme(id: ThemeId) {
    if (!isThemeId(id)) return;
    if (themeId.value === id) {
      applyThemeToDom(id);
      return;
    }
    themeId.value = id;
    applyThemeToDom(id);
    clearMermaidCache();
  }

  function hydrate(id: unknown) {
    const next = isThemeId(id) ? id : DEFAULT_THEME_ID;
    themeId.value = next;
    applyThemeToDom(next);
  }

  return {
    themeId,
    meta,
    isDark,
    mermaidMode,
    themes,
    setTheme,
    hydrate,
  };
});
