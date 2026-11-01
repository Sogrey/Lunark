export const MARK_DELIMS: Record<string, [open: string, close: string]> = {
  strong: ["**", "**"],
  emphasis: ["*", "*"],
  inlineCode: ["`", "`"],
  strikethrough: ["~~", "~~"],
  strike_through: ["~~", "~~"],
};

export const PREVIEW_FIRST_LANGS = new Set([
  "mermaid",
  "latex",
  "tex",
  "math",
  "katex",
  // ::: 容器在混合模式里以同名围栏呈现
  "tip",
  "info",
  "warning",
  "danger",
  "details",
  "align-left",
  "align-center",
  "align-right",
]);
