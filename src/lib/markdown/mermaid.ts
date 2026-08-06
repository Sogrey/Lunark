import mermaid from "mermaid";

let initialized = false;
const svgCache = new Map<string, string>();
let renderSeq = 0;

function ensureInit() {
  if (initialized) return;
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
  initialized = true;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function renderMermaidSvg(source: string): Promise<string> {
  const code = source.trim();
  if (!code) return "";

  const cached = svgCache.get(code);
  if (cached) return cached;

  ensureInit();
  const id = `lunark-mermaid-${++renderSeq}`;

  try {
    const { svg } = await mermaid.render(id, code);
    svgCache.set(code, svg);
    if (svgCache.size > 80) {
      const first = svgCache.keys().next().value;
      if (first) svgCache.delete(first);
    }
    return svg;
  } catch (e) {
    // 失败时清掉同 id 残留节点
    document.getElementById(id)?.remove();
    const message = e instanceof Error ? e.message : String(e);
    return `<pre class="mermaid-error">Mermaid 渲染失败\n${escapeHtml(message)}\n\n${escapeHtml(code)}</pre>`;
  }
}

/** 主题或消毒策略变更后可调用，避免命中旧（无文字）缓存 */
export function clearMermaidCache() {
  svgCache.clear();
  initialized = false;
}
