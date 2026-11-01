/**
 * KaTeX 按需加载：首次遇到公式再拉 CSS + @mdit/plugin-katex。
 * 与 Shiki「先预载常用、其余按需」同思路；无公式文档不进主包热路径。
 */
import MarkdownIt from "markdown-it";

type MarkdownItInstance = InstanceType<typeof MarkdownIt>;

/** 粗判正文是否含美元公式 / LaTeX 环境（宁可多加载，勿漏渲染） */
export function sourceLikelyHasMath(source: string): boolean {
  return /\$\$[\s\S]+?\$\$|(?<![\\$])\$(?!\$)[^$\n]+\$|\\begin\{[a-zA-Z*]+\}/.test(
    source,
  );
}

let cssPromise: Promise<void> | null = null;
let pluginPromise: Promise<void> | null = null;
let pluginApplied = false;

/** 注入 KaTeX 样式（idempotent） */
export function ensureKatexCss(): Promise<void> {
  if (!cssPromise) {
    cssPromise = import("katex/dist/katex.min.css").then(() => undefined);
  }
  return cssPromise;
}

/**
 * 在给定 markdown-it 实例上注册 KaTeX 插件（只注册一次），并确保 CSS 已加载。
 */
export function ensureKatexPlugin(md: MarkdownItInstance): Promise<void> {
  if (pluginApplied) return ensureKatexCss();
  if (!pluginPromise) {
    pluginPromise = (async () => {
      const [{ katex }] = await Promise.all([
        import("@mdit/plugin-katex"),
        ensureKatexCss(),
      ]);
      if (!pluginApplied) {
        md.use(katex, {
          delimiters: "dollars",
          throwOnError: false,
        });
        pluginApplied = true;
      }
    })();
  }
  return pluginPromise;
}
