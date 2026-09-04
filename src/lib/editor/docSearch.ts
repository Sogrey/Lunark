import type { Node as PmNode } from "@milkdown/kit/prose/model";
import { TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";

export type SearchQueryOpts = {
  search: string;
  replace: string;
  caseSensitive: boolean;
  wholeWord: boolean;
};

export type SearchMatchInfo = {
  index: number;
  total: number;
};

export interface DocSearchBridge {
  setQuery: (opts: SearchQueryOpts) => SearchMatchInfo;
  findNext: () => SearchMatchInfo;
  findPrevious: () => SearchMatchInfo;
  replaceNext: () => SearchMatchInfo;
  replaceAll: () => SearchMatchInfo;
  focusEditor: () => void;
}

let bridge: DocSearchBridge | null = null;

export function setDocSearchBridge(next: DocSearchBridge | null) {
  bridge = next;
}

export function clearDocSearchBridge(expected: DocSearchBridge) {
  if (bridge === expected) bridge = null;
}

export function getDocSearchBridge(): DocSearchBridge | null {
  return bridge;
}

function isWordChar(ch: string): boolean {
  return /[0-9A-Za-z\u00C0-\u024F\u4e00-\u9fff]/.test(ch);
}

function isWholeWord(
  text: string,
  start: number,
  end: number,
): boolean {
  const before = start > 0 ? text[start - 1]! : "";
  const after = end < text.length ? text[end]! : "";
  if (before && isWordChar(before)) return false;
  if (after && isWordChar(after)) return false;
  return true;
}

/** 在 ProseMirror 文档中收集文本匹配（文档坐标） */
export function collectPmTextMatches(
  doc: PmNode,
  opts: SearchQueryOpts,
): { from: number; to: number }[] {
  const needleRaw = opts.search;
  if (!needleRaw) return [];
  const needle = opts.caseSensitive ? needleRaw : needleRaw.toLowerCase();
  const matches: { from: number; to: number }[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const hay = opts.caseSensitive ? node.text : node.text.toLowerCase();
    let idx = 0;
    while (idx <= hay.length - needle.length) {
      const found = hay.indexOf(needle, idx);
      if (found < 0) break;
      const from = pos + found;
      const to = from + needleRaw.length;
      if (
        !opts.wholeWord ||
        isWholeWord(node.text, found, found + needleRaw.length)
      ) {
        matches.push({ from, to });
      }
      idx = found + Math.max(1, needle.length);
    }
  });

  return matches;
}

export function matchInfoFromSelection(
  matches: { from: number; to: number }[],
  head: number,
): SearchMatchInfo {
  if (matches.length === 0) return { index: 0, total: 0 };
  let idx = matches.findIndex((m) => m.from <= head && m.to >= head);
  if (idx < 0) idx = matches.findIndex((m) => m.from >= head);
  return { index: idx >= 0 ? idx + 1 : 1, total: matches.length };
}

export function createHybridDocSearch(
  getView: () => EditorView | null,
): DocSearchBridge {
  let opts: SearchQueryOpts = {
    search: "",
    replace: "",
    caseSensitive: false,
    wholeWord: false,
  };
  let matches: { from: number; to: number }[] = [];

  function refreshMatches(view: EditorView) {
    matches = collectPmTextMatches(view.state.doc, opts);
  }

  function selectMatch(
    view: EditorView,
    match: { from: number; to: number },
  ): SearchMatchInfo {
    const sel = TextSelection.create(view.state.doc, match.from, match.to);
    view.dispatch(view.state.tr.setSelection(sel).scrollIntoView());
    const idx = matches.findIndex(
      (m) => m.from === match.from && m.to === match.to,
    );
    return {
      index: idx >= 0 ? idx + 1 : 1,
      total: matches.length,
    };
  }

  function currentIndex(view: EditorView): number {
    const head = view.state.selection.from;
    return matches.findIndex((m) => m.from <= head && m.to >= head);
  }

  return {
    setQuery(next) {
      opts = { ...next };
      const view = getView();
      if (!view) return { index: 0, total: 0 };
      refreshMatches(view);
      return matchInfoFromSelection(matches, view.state.selection.from);
    },

    findNext() {
      const view = getView();
      if (!view || !opts.search) return { index: 0, total: 0 };
      refreshMatches(view);
      if (matches.length === 0) return { index: 0, total: 0 };
      const head = view.state.selection.to;
      const cur = currentIndex(view);
      let nextIdx: number;
      if (cur >= 0) {
        nextIdx = (cur + 1) % matches.length;
      } else {
        nextIdx = matches.findIndex((m) => m.from >= head);
        if (nextIdx < 0) nextIdx = 0;
      }
      return selectMatch(view, matches[nextIdx]!);
    },

    findPrevious() {
      const view = getView();
      if (!view || !opts.search) return { index: 0, total: 0 };
      refreshMatches(view);
      if (matches.length === 0) return { index: 0, total: 0 };
      const head = view.state.selection.from;
      const cur = currentIndex(view);
      let prevIdx: number;
      if (cur >= 0) {
        prevIdx = (cur - 1 + matches.length) % matches.length;
      } else {
        prevIdx = -1;
        for (let i = matches.length - 1; i >= 0; i -= 1) {
          if (matches[i]!.to <= head) {
            prevIdx = i;
            break;
          }
        }
        if (prevIdx < 0) prevIdx = matches.length - 1;
      }
      return selectMatch(view, matches[prevIdx]!);
    },

    replaceNext() {
      const view = getView();
      if (!view || !opts.search) return { index: 0, total: 0 };
      refreshMatches(view);
      if (matches.length === 0) return { index: 0, total: 0 };

      let cur = currentIndex(view);
      if (cur < 0) {
        return this.findNext();
      }
      const match = matches[cur]!;
      const tr = view.state.tr.insertText(opts.replace, match.from, match.to);
      view.dispatch(tr.scrollIntoView());
      refreshMatches(view);
      if (matches.length === 0) return { index: 0, total: 0 };
      const next = matches[Math.min(cur, matches.length - 1)]!;
      return selectMatch(view, next);
    },

    replaceAll() {
      const view = getView();
      if (!view || !opts.search) return { index: 0, total: 0 };
      refreshMatches(view);
      if (matches.length === 0) return { index: 0, total: 0 };

      let tr = view.state.tr;
      // 从后往前替换，避免位移
      for (let i = matches.length - 1; i >= 0; i -= 1) {
        const m = matches[i]!;
        tr = tr.insertText(opts.replace, m.from, m.to);
      }
      view.dispatch(tr.scrollIntoView());
      matches = [];
      return { index: 0, total: 0 };
    },

    focusEditor() {
      getView()?.focus();
    },
  };
}
