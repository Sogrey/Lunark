/**
 * 图片尺寸扩展（源码可写）：
 * - Typora 风：`![alt](url =400x300)` / `=400x` / `=x200`
 * - attrs 风：`![alt](url){width=400}` / `{width=400 height=200}`
 *
 * 渲染前把 Typora 写法规范成 attrs，再交 markdown-it-attrs。
 */

const IMG_RE =
  /!\[([^\]]*)\]\((<)?([^>\n)]+?)(>)?\)(\{([^}]*)\})?/g;

/** 从 `=400x300` / `=400x` / `=x200` 解析宽高（空串表示未指定） */
export function parseEqualsSize(
  spec: string,
): { width: string; height: string } | null {
  const m = /^(\d*)x(\d*)$/.exec(spec.trim());
  if (!m) return null;
  const width = m[1] ?? "";
  const height = m[2] ?? "";
  if (!width && !height) return null;
  return { width, height };
}

function buildAttrs(
  width: string,
  height: string,
  existingInner: string | undefined,
): string {
  const parts: string[] = [];
  if (existingInner?.trim()) {
    parts.push(existingInner.trim());
  }
  const hasW = /\bwidth\s*=/i.test(existingInner ?? "");
  const hasH = /\bheight\s*=/i.test(existingInner ?? "");
  if (width && !hasW) parts.push(`width=${width}`);
  if (height && !hasH) parts.push(`height=${height}`);
  if (parts.length === 0) return "";
  return `{${parts.join(" ")}}`;
}

/**
 * 将 `![alt](path =WxH)` 转为 `![alt](path){width=W height=H}`。
 * 已有 `{...}` 时合并尺寸键（不覆盖已有 width/height）。
 */
export function expandImageSizeSyntax(source: string): string {
  return source.replace(
    IMG_RE,
    (
      _full,
      alt: string,
      _open: string | undefined,
      destRaw: string,
      _close: string | undefined,
      _brace: string | undefined,
      attrsInner: string | undefined,
    ) => {
      let dest = destRaw.trim();
      let width = "";
      let height = "";

      const sized = /^(.*?)\s+=\s*(\d*)x(\d*)\s*$/.exec(dest);
      if (sized) {
        dest = (sized[1] ?? "").trim();
        width = sized[2] ?? "";
        height = sized[3] ?? "";
      }

      const attrs = buildAttrs(width, height, attrsInner);
      return `![${alt}](${dest})${attrs}`;
    },
  );
}

/** 仅允许安全的尺寸属性写入 img */
export function sanitizeSizeValue(raw: string): string | null {
  const v = raw.trim();
  if (/^\d{1,5}$/.test(v)) return v;
  if (/^\d{1,5}px$/i.test(v)) return v.replace(/px$/i, "");
  if (/^\d{1,3}%$/.test(v)) return v;
  return null;
}
