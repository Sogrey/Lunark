import { createHighlighter, type Highlighter, type ShikiTransformer } from "shiki";

/** 首屏只预加载常用语言，其余按需 loadLanguage */
const BOOT_LANGS = [
  "typescript",
  "javascript",
  "json",
  "markdown",
  "rust",
  "python",
  "bash",
  "html",
  "css",
] as const;

const THEME_DARK = "one-dark-pro";
const THEME_LIGHT = "github-light";

export type ShikiThemeMode = "dark" | "light";

export interface HighlightOptions {
  /** 预览显示行号（prefs，默认关） */
  lineNumbers?: boolean;
  /** 1-based 高亮行 */
  highlightLines?: readonly number[];
}

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEME_DARK, THEME_LIGHT],
      langs: [...BOOT_LANGS],
    });
  }
  return highlighterPromise;
}

function normalizeLang(lang: string): string {
  const map: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    sh: "bash",
    shell: "bash",
    yml: "yaml",
    rs: "rust",
    md: "markdown",
    powershell: "powershell",
    ps1: "powershell",
  };
  const key = lang.toLowerCase().trim();
  return map[key] ?? key;
}

function themeName(mode: ShikiThemeMode): string {
  return mode === "light" ? THEME_LIGHT : THEME_DARK;
}

function buildTransformers(options: HighlightOptions): ShikiTransformer[] {
  const highlight = new Set(options.highlightLines ?? []);
  const lineNumbers = options.lineNumbers === true;
  if (!lineNumbers && highlight.size === 0) return [];

  return [
    {
      name: "lunark-lines",
      pre(node) {
        if (lineNumbers) this.addClassToHast(node, "has-line-numbers");
        if (highlight.size > 0) this.addClassToHast(node, "has-line-highlights");
      },
      line(node, line) {
        node.properties = node.properties ?? {};
        node.properties["data-line"] = String(line);
        if (highlight.has(line)) this.addClassToHast(node, "highlighted");
      },
    },
  ];
}

export async function highlightCode(
  code: string,
  lang: string,
  mode: ShikiThemeMode = "dark",
  options: HighlightOptions = {},
): Promise<string> {
  const highlighter = await getHighlighter();
  const normalized = normalizeLang(lang || "text");
  const theme = themeName(mode);
  const transformers = buildTransformers(options);

  let useLang = "text";
  const loaded = highlighter.getLoadedLanguages();
  if (loaded.includes(normalized as never)) {
    useLang = normalized;
  } else if (normalized && normalized !== "text") {
    try {
      await highlighter.loadLanguage(normalized as never);
      useLang = normalized;
    } catch {
      useLang = "text";
    }
  }

  try {
    return highlighter.codeToHtml(code, {
      lang: useLang,
      theme,
      transformers,
    });
  } catch {
    return highlighter.codeToHtml(code, {
      lang: "text",
      theme,
      transformers,
    });
  }
}
