/**
 * 渲染前把图片 URL 中的空格/中文等编码，使 markdown-it 能识别
 * `![alt](./assets/foo bar.png)` 这类本不合法的目的地。
 */
export function normalizeImageDestinations(source: string): string {
  return source.replace(
    /!\[([^\]]*)\]\((<)?([^>\n)]+)(>)?\)/g,
    (_m, alt: string, _open: string | undefined, url: string) => {
      const trimmed = url.trim();
      if (/^(?:https?:|data:|blob:|asset:)/i.test(trimmed)) {
        return `![${alt}](${trimmed})`;
      }

      let decoded = trimmed;
      try {
        decoded = decodeURI(trimmed);
      } catch {
        /* keep */
      }

      const encoded = decoded
        .split("/")
        .map((seg) => {
          if (seg === "." || seg === ".." || seg === "") return seg;
          try {
            return encodeURIComponent(decodeURIComponent(seg));
          } catch {
            return encodeURIComponent(seg);
          }
        })
        .join("/");

      return `![${alt}](${encoded})`;
    },
  );
}
