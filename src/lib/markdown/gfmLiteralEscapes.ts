/**
 * GFM autolink-literal 的 toMarkdown 会把「词间 @」写成 `\@`，
 * 以免再解析成邮箱；对 `Zhsa@2026` 这类非邮箱也会误逃逸。
 * 真实邮箱在 Crepe 里会变成 `<a@b.com>`，不会留下 `\@`。
 * 写回源码 / Tab 时去掉这类多余转义，避免混合编辑 → 源码出现 `\@`。
 */
export function unescapeGfmLiteralEscapes(md: string): string {
  return md.replace(/\\@/g, "@");
}
