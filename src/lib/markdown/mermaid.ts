import mermaid from "mermaid";
import { t } from "@/lib/i18n";

export type MermaidThemeMode = "dark" | "light";

let activeMode: MermaidThemeMode | null = null;
const svgCache = new Map<string, string>();
let renderSeq = 0;

function ensureInit(mode: MermaidThemeMode) {
  if (activeMode === mode) return;
  activeMode = mode;
  svgCache.clear();

  if (mode === "light") {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "antiscript",
      theme: "default",
      flowchart: {
        // false：生成 SVG <text>，浏览器栅格化与 Typst 都能保留文字
        // true：foreignObject，<img>/Typst 都会变成空框
        htmlLabels: false,
        useMaxWidth: false,
      },
      themeVariables: {
        darkMode: false,
        background: "#ffffff",
        primaryColor: "#e8f4fc",
        primaryTextColor: "#1a1a1a",
        primaryBorderColor: "#4a90c8",
        secondaryColor: "#f5f5f5",
        tertiaryColor: "#eeeeee",
        lineColor: "#555555",
        textColor: "#1a1a1a",
        mainBkg: "#e8f4fc",
        nodeBorder: "#4a90c8",
        clusterBkg: "#f7f7f7",
        titleColor: "#111111",
        edgeLabelBackground: "#ffffff",
        fontFamily:
          '"Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
      },
    });
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    // strict 会剥掉 foreignObject 内 HTML 标签文字，节点变成空框
    securityLevel: "antiscript",
    theme: "dark",
    flowchart: {
      htmlLabels: true,
      useMaxWidth: true,
    },
    themeVariables: {
      darkMode: true,
      background: "#363b40",
      primaryColor: "#2e3033",
      primaryTextColor: "#b8bfc6",
      primaryBorderColor: "#474d54",
      secondaryColor: "#32363b",
      tertiaryColor: "#42464a",
      lineColor: "#8c8e92",
      textColor: "#b8bfc6",
      mainBkg: "#2e3033",
      nodeBorder: "#6dc1e7",
      clusterBkg: "#32363b",
      titleColor: "#dedede",
      edgeLabelBackground: "#363b40",
      fontFamily:
        '"Helvetica Neue", Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
    },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Mermaid 并发 render 易卡死，串行化所有渲染请求 */
let renderChain: Promise<unknown> = Promise.resolve();

export function renderMermaidSvg(
  source: string,
  mode: MermaidThemeMode = "dark",
): Promise<string> {
  const code = source.trim();
  if (!code) return Promise.resolve("");

  const cacheKey = `${mode}::${code}`;
  const cached = svgCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const run = async (): Promise<string> => {
    const again = svgCache.get(cacheKey);
    if (again) return again;

    ensureInit(mode);
    const id = `lunark-mermaid-${++renderSeq}`;
    try {
      const { svg } = await mermaid.render(id, code);
      svgCache.set(cacheKey, svg);
      if (svgCache.size > 80) {
        const first = svgCache.keys().next().value;
        if (first) svgCache.delete(first);
      }
      return svg;
    } catch (e) {
      document.getElementById(id)?.remove();
      const message = e instanceof Error ? e.message : String(e);
      return `<pre class="mermaid-error">${escapeHtml(t("msg.mermaidFail"))}\n${escapeHtml(message)}\n\n${escapeHtml(code)}</pre>`;
    }
  };

  const result = renderChain.then(run, run);
  renderChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/** 主题或消毒策略变更后可调用，避免命中旧（无文字）缓存 */
export function clearMermaidCache() {
  svgCache.clear();
  activeMode = null;
}
