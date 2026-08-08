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
]);
