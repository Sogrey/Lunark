import { createHighlighter, type Highlighter } from "shiki";

const LANGS = [
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "json",
  "html",
  "css",
  "scss",
  "rust",
  "python",
  "bash",
  "shell",
  "powershell",
  "markdown",
  "yaml",
  "toml",
  "sql",
  "go",
  "java",
  "c",
  "cpp",
  "xml",
  "vue",
  "diff",
  "dockerfile",
  "ini",
] as const;

const THEME = "one-dark-pro";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEME],
      langs: [...LANGS],
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

export async function highlightCode(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter();
  const normalized = normalizeLang(lang || "text");
  const loaded = highlighter.getLoadedLanguages();
  const useLang = loaded.includes(normalized as never) ? normalized : "text";

  try {
    return highlighter.codeToHtml(code, {
      lang: useLang,
      theme: THEME,
    });
  } catch {
    return highlighter.codeToHtml(code, {
      lang: "text",
      theme: THEME,
    });
  }
}
