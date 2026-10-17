/**
 * 预览 HTML 上的内容区类名，供外部主题命中围栏、任务、图片、脚注。
 * 不改写用户 CSS。
 */

function addClass(tag: string, attrs: string, extra: string): string {
  if (new RegExp(`(?:^|\\s)${extra}(?:\\s|$)`).test(attrs)) {
    return `<${tag}${attrs}>`;
  }
  if (/\bclass\s*=\s*['"]/i.test(attrs)) {
    return `<${tag}${attrs.replace(
      /class\s*=\s*(['"])/i,
      `class=$1${extra} `,
    )}>`;
  }
  return `<${tag} class="${extra}"${attrs}>`;
}

function retag(
  html: string,
  tag: string,
  extra: string,
  when?: (attrs: string) => boolean,
): string {
  const re = new RegExp(`<${tag}\\b([^>]*)>`, "gi");
  return html.replace(re, (full, attrs: string) => {
    if (when && !when(attrs)) return full;
    return addClass(tag, attrs, extra);
  });
}

export function applyPreviewThemeClasses(html: string): string {
  let out = retag(html, "pre", "md-fences");
  out = retag(out, "div", "md-fences", (attrs) =>
    /mermaid-block/.test(attrs),
  );
  out = retag(out, "li", "md-task-list-item", (attrs) =>
    /task-list-item/.test(attrs),
  );
  out = retag(out, "img", "md-image");
  out = retag(out, "section", "md-footnote", (attrs) =>
    /footnotes/.test(attrs),
  );
  return out;
}
