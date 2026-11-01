/**
 * 预览 HTML 净化（DOMPurify）。
 *
 * 策略说明见 docs/SECURITY-XSS.md。
 * 扩展白名单只改本文件的 ADD_TAGS / ADD_ATTR，并在文档中登记原因。
 */
import DOMPurify from "dompurify";
import type { Config as DomPurifyConfig } from "dompurify";

/** MathML / SVG / tip 容器等扩展标签（相对默认 HTML profile） */
export const PREVIEW_ADD_TAGS = [
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
  "details",
  "summary",
] as const;

/**
 * 扩展属性。含 SVG/Math 绘制字段、无障碍、以及预览管线自用 data-*。
 * 勿轻易加 `on*` / `srcdoc` / `formaction` 等。
 */
export const PREVIEW_ADD_ATTR = [
  "style",
  "class",
  "id",
  "open",
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
  "data-line-highlight",
  "data-line",
] as const;

export const PREVIEW_SANITIZE_CONFIG: DomPurifyConfig = {
  USE_PROFILES: { html: true, svg: true, svgFilters: true },
  ADD_TAGS: [...PREVIEW_ADD_TAGS],
  ADD_ATTR: [...PREVIEW_ADD_ATTR],
};

/** markdown-it 渲染结果 → 可安全 v-html 的字符串 */
export function sanitizePreviewHtml(html: string): string {
  return DOMPurify.sanitize(html, PREVIEW_SANITIZE_CONFIG);
}
