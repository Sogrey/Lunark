/**
 * `[[Page Name]]` / `[[Page Name|label]]` → 可点击链接；并收集反链索引。
 */

export interface WikiLinkHit {
  target: string;
  label: string;
  /** 0-based char offset in source (approx) */
  index: number;
}

const WIKI_RE = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g;

export function extractWikiLinks(source: string): WikiLinkHit[] {
  const out: WikiLinkHit[] = [];
  WIKI_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WIKI_RE.exec(source))) {
    const target = m[1]!.trim();
    if (!target) continue;
    out.push({
      target,
      label: (m[2] ?? target).trim(),
      index: m.index,
    });
  }
  return out;
}

/** 将 wiki 链替换为 markdown 链接（预览用） */
export function expandWikiLinksForPreview(source: string): string {
  return source.replace(WIKI_RE, (_full, target: string, label?: string) => {
    const t = String(target).trim();
    const l = (label ?? t).trim() || t;
    const href = `wikilink:${encodeURIComponent(t)}`;
    return `[${l}](${href})`;
  });
}

/** 工作区内按标题/文件名解析目标路径（不含扩展名匹配） */
export function resolveWikiTarget(
  target: string,
  mdPaths: string[],
): string | null {
  const needle = target.trim().toLowerCase().replace(/\\/g, "/");
  if (!needle) return null;
  const baseOf = (p: string) => {
    const name = p.replace(/\\/g, "/").split("/").pop() || "";
    return name.replace(/\.(md|markdown|mdown|mkd)$/i, "").toLowerCase();
  };
  // exact basename
  for (const p of mdPaths) {
    if (baseOf(p) === needle) return p;
  }
  // basename includes
  for (const p of mdPaths) {
    if (baseOf(p).includes(needle) || needle.includes(baseOf(p))) return p;
  }
  return null;
}

export interface BacklinkEntry {
  path: string;
  name: string;
  count: number;
}

/** 扫描多文件，找出指向 currentBase 的反链 */
export function buildBacklinks(
  currentPath: string | null,
  files: { path: string; name: string; text: string }[],
): BacklinkEntry[] {
  if (!currentPath) return [];
  const curBase = currentPath
    .replace(/\\/g, "/")
    .split("/")
    .pop()!
    .replace(/\.(md|markdown|mdown|mkd)$/i, "")
    .toLowerCase();
  const out: BacklinkEntry[] = [];
  for (const f of files) {
    if (f.path === currentPath) continue;
    const links = extractWikiLinks(f.text);
    const count = links.filter(
      (l) => l.target.trim().toLowerCase() === curBase,
    ).length;
    if (count > 0) out.push({ path: f.path, name: f.name, count });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
