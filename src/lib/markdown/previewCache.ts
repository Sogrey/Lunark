/**
 * 预览段落级缓存：按块哈希复用已渲染 HTML，减少长文全量重渲。
 */

export interface PreviewBlock {
  key: string;
  source: string;
}

/** 按空行与围栏切块（围栏整块保留） */
export function splitPreviewBlocks(source: string): PreviewBlock[] {
  const text = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");
  const blocks: string[] = [];
  let buf: string[] = [];
  let inFence = false;

  const flush = () => {
    const chunk = buf.join("\n");
    if (chunk.trim().length > 0 || blocks.length === 0) {
      blocks.push(chunk);
    }
    buf = [];
  };

  for (const line of lines) {
    if (/^(`{3,}|~{3,})/.test(line.trimStart())) {
      inFence = !inFence;
      buf.push(line);
      continue;
    }
    if (!inFence && line.trim() === "") {
      buf.push(line);
      flush();
      continue;
    }
    buf.push(line);
  }
  if (buf.length) flush();

  return blocks.map((source, i) => ({
    key: `${i}:${fnv1a(source)}`,
    source,
  }));
}

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export class PreviewBlockCache {
  private map = new Map<string, string>();
  private max = 200;

  get(key: string): string | undefined {
    return this.map.get(key);
  }

  set(key: string, html: string) {
    if (this.map.size >= this.max) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
    this.map.set(key, html);
  }

  clear() {
    this.map.clear();
  }
}

export const previewBlockCache = new PreviewBlockCache();
