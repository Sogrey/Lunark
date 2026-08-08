import { createI18n } from "vue-i18n";
import type { MessageSchema } from "@/locales/types";
import zhCN from "@/locales/zh-CN";
import zhTW from "@/locales/zh-TW";
import en from "@/locales/en";
import ko from "@/locales/ko";
import ja from "@/locales/ja";

export const LOCALE_IDS = ["zh-CN", "zh-TW", "en", "ko", "ja"] as const;
export type LocaleId = (typeof LOCALE_IDS)[number];

export function isLocaleId(v: unknown): v is LocaleId {
  return typeof v === "string" && (LOCALE_IDS as readonly string[]).includes(v);
}

/** 系统语言 → 支持的 locale；无法匹配则简体中文 */
export function detectLocale(): LocaleId {
  if (typeof navigator === "undefined") return "zh-CN";
  const raw = (navigator.language || "zh-CN").toLowerCase();
  if (raw.startsWith("zh")) {
    if (raw.includes("tw") || raw.includes("hk") || raw.includes("hant")) {
      return "zh-TW";
    }
    return "zh-CN";
  }
  if (raw.startsWith("en")) return "en";
  if (raw.startsWith("ko")) return "ko";
  if (raw.startsWith("ja")) return "ja";
  return "zh-CN";
}

const messages = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  en,
  ko,
  ja,
} satisfies Record<LocaleId, MessageSchema>;

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: "zh-CN",
  messages,
  missing: (_locale, key) => {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] missing key: ${String(key)}`);
    }
    return String(key);
  },
});

/** composition API 下 locale 为 Ref；统一经此读写 */
function localeWritable(): { get: () => string; set: (v: string) => void } {
  const loc = (i18n.global as unknown as { locale: { value: string } }).locale;
  return {
    get: () => loc.value,
    set: (v) => {
      loc.value = v;
    },
  };
}

export function t(key: string, values?: Record<string, unknown>): string {
  return String(
    (i18n.global as { t: (k: string, v?: Record<string, unknown>) => unknown }).t(
      key,
      values ?? {},
    ),
  );
}

export function getLocale(): LocaleId {
  const value = localeWritable().get();
  return isLocaleId(value) ? value : "zh-CN";
}

/** 供 computed 追踪语言变化（必须读 Ref.value） */
export function trackLocale(): LocaleId {
  return getLocale();
}

/** 切换语言（不写 prefs；由调用方持久化并 refreshAppMenu） */
export function setLocale(locale: LocaleId): void {
  localeWritable().set(locale);
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

export const LOCALE_MENU_KEYS: Record<LocaleId, string> = {
  "zh-CN": "menu.langZhCN",
  "zh-TW": "menu.langZhTW",
  en: "menu.langEn",
  ko: "menu.langKo",
  ja: "menu.langJa",
};
