import MarkdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";
import markdownItTaskLists from "markdown-it-task-lists";
import { katex } from "@mdit/plugin-katex";
import DOMPurify from "dompurify";
import { enhanceFencedBlocks } from "@/lib/markdown/enhance";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
})
  .use(markdownItFootnote)
  .use(markdownItTaskLists, { enabled: true, label: true })
  .use(katex, {
    // 允许 $...$ / $$...$$
    delimiters: "dollars",
    throwOnError: false,
  });

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

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_TAGS: [
      "foreignObject",
      "annotation",
      "semantics",
      "math",
      "mrow",
      "mi",
      "mo",
      "mn",
      "ms",
      "mtext",
    ],
    ADD_ATTR: [
      "style",
      "class",
      "id",
      "viewBox",
      "xmlns",
      "fill",
      "stroke",
      "stroke-width",
      "d",
      "cx",
      "cy",
      "r",
      "x",
      "y",
      "width",
      "height",
      "transform",
      "marker-end",
      "marker-start",
      "points",
      "x1",
      "x2",
      "y1",
      "y2",
      "text-anchor",
      "dominant-baseline",
      "aria-hidden",
      "role",
      "focusable",
      "tabindex",
    ],
  });
}

export async function renderMarkdown(source: string): Promise<RenderResult> {
  const { matter, body } = splitFrontMatter(source);
  const bodyHtml = md.render(body);
  // 先消毒普通 HTML，再注入 Mermaid/Shiki，避免 SVG foreignObject 内文字被剥掉
  const safe = sanitizeHtml(bodyHtml);
  const enhanced = await enhanceFencedBlocks(safe);

  let html = enhanced;
  if (matter?.trim()) {
    const fm = sanitizeHtml(matter.trim());
    html = `<pre class="front-matter">${fm}</pre>${enhanced}`;
  }

  return {
    html,
    frontMatterRaw: matter,
  };
}
