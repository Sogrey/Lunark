import MarkdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";
import markdownItFootnote from "markdown-it-footnote";
import markdownItTaskLists from "markdown-it-task-lists";
import { enhanceFencedBlocks } from "@/lib/markdown/enhance";
import { useMarkdownContainers } from "@/lib/markdown/containers";
import { parseFenceInfo } from "@/lib/markdown/fenceInfo";
import {
  expandImageSizeSyntax,
  sanitizeSizeValue,
} from "@/lib/markdown/imageSize";
import {
  ensureKatexPlugin,
  sourceLikelyHasMath,
} from "@/lib/markdown/katexLazy";
import { normalizeImageDestinations } from "@/lib/markdown/normalizeImages";
import { applyPreviewThemeClasses } from "@/lib/markdown/previewThemeClasses";
import { sanitizePreviewHtml } from "@/lib/markdown/sanitize";
import { stripHeadingAnchorMarkers } from "@/lib/markdown/toc";
import { expandWikiLinksForPreview } from "@/lib/markdown/wikiLinks";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
})
  .enable("strikethrough")
  .use(markdownItFootnote)
  .use(markdownItTaskLists, { enabled: false, label: true })
  // KaTeX 首次遇公式再 .use（见 ensureKatexPlugin）
  .use(markdownItAttrs, {
    allowedAttributes: ["width", "height", "class"],
  });

useMarkdownContainers(md);

/** 尺寸属性消毒，避免 attrs 注入异常值 */
const defaultImage = md.renderer.rules.image;
if (defaultImage) {
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]!;
    if (token.attrs) {
      const next: [string, string][] = [];
      for (const [k, v] of token.attrs) {
        const val = String(v);
        if (k === "width" || k === "height") {
          const safe = sanitizeSizeValue(val);
          if (safe) next.push([k, safe]);
          continue;
        }
        if (k === "class" || k === "src" || k === "alt" || k === "title") {
          next.push([k, val]);
        }
      }
      token.attrs = next;
    }
    return defaultImage(tokens, idx, options, env, self);
  };
}

/** 保留 `{1,3-5}` 到 data-line-highlight，语言类名保持干净 */
const defaultFence = md.renderer.rules.fence;
if (defaultFence) {
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]!;
    const rawInfo = token.info ?? "";
    const { lang, highlightLines } = parseFenceInfo(rawInfo);
    const saved = token.info;
    token.info = lang;
    let html = defaultFence(tokens, idx, options, env, self);
    token.info = saved;
    if (highlightLines.length > 0) {
      const attr = ` data-line-highlight="${highlightLines.join(",")}"`;
      html = html.replace(/<code\b/, `<code${attr}`);
    }
    return html;
  };
}

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export interface RenderResult {
  html: string;
  frontMatterRaw: string | null;
}

function splitFrontMatter(source: string): {
  matter: string | null;
  body: string;
} {
  const match = FRONT_MATTER_RE.exec(source);
  if (!match) return { matter: null, body: source };
  return { matter: match[1], body: source.slice(match[0].length) };
}

export async function renderMarkdown(source: string): Promise<RenderResult> {
  const { matter, body } = splitFrontMatter(source);
  const withWiki = expandWikiLinksForPreview(body);
  const withSizes = expandImageSizeSyntax(withWiki);
  const normalized = normalizeImageDestinations(withSizes);
  // 剥 `{#id}` 标记；大纲 id 仍由 extractToc（含自定义锚点）+ applyTocIdsToHtml
  const forRender = stripHeadingAnchorMarkers(normalized);
  if (sourceLikelyHasMath(forRender)) {
    await ensureKatexPlugin(md);
  }
  const bodyHtml = md.render(forRender);
  // 先消毒普通 HTML，再注入 Mermaid/Shiki，避免 SVG foreignObject 内文字被剥掉
  const safe = sanitizePreviewHtml(bodyHtml);
  const enhanced = await enhanceFencedBlocks(safe);
  const withHooks = applyPreviewThemeClasses(enhanced);

  let html = withHooks;
  if (matter?.trim()) {
    const fm = sanitizePreviewHtml(matter.trim());
    html = `<pre class="front-matter md-meta">${fm}</pre>${withHooks}`;
  }

  return {
    html,
    frontMatterRaw: matter,
  };
}
