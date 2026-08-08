/** 文档字数统计（中文按字、英文按词） */

export interface DocStats {
  /** 含空白的字符数 */
  chars: number;
  /** 去空白字符数 */
  charsNoSpace: number;
  /** 词数：每个 CJK 计 1；连续拉丁/数字计 1 */
  words: number;
  /** 行数（至少 1，空文档为 0） */
  lines: number;
}

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
const LATIN_WORD = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

export function computeDocStats(text: string): DocStats {
  if (!text) {
    return { chars: 0, charsNoSpace: 0, words: 0, lines: 0 };
  }

  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, "").length;
  const lines = text.split(/\r\n|\r|\n/).length;

  const cjkMatches = text.match(CJK);
  const cjkCount = cjkMatches?.length ?? 0;
  const withoutCjk = text.replace(CJK, " ");
  const latinMatches = withoutCjk.match(LATIN_WORD);
  const latinCount = latinMatches?.length ?? 0;

  return {
    chars,
    charsNoSpace,
    words: cjkCount + latinCount,
    lines,
  };
}
