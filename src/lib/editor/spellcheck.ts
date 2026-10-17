/**
 * 源码模式英文拼写：ViewPlugin + Decoration（不依赖 @codemirror/lint）。
 */
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { EN_WORDS } from "@/lib/editor/enWordList";

const misspellMark = Decoration.mark({ class: "cm-spell-error" });

const WORD_RE = /\b[A-Za-z][A-Za-z']{2,}\b/g;

function inFenceOrCode(line: string, from: number, to: number): boolean {
  const before = line.slice(0, from);
  const ticks = (before.match(/`/g) ?? []).length;
  if (ticks % 2 === 1) return true;
  if (/https?:\/\//i.test(line.slice(Math.max(0, from - 8), to + 8))) return true;
  return false;
}

function buildDecos(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<ReturnType<typeof Decoration.mark>>();
  const doc = view.state.doc;
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;
    if (/^\s*```/.test(text) || /^\s{4}/.test(text)) continue;
    WORD_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = WORD_RE.exec(text))) {
      const word = m[0]!;
      const lower = word.toLowerCase();
      if (EN_WORDS.has(lower)) continue;
      if (word === word.toUpperCase() && word.length <= 5) continue; // 缩写
      if (inFenceOrCode(text, m.index, m.index + word.length)) continue;
      const from = line.from + m.index;
      const to = from + word.length;
      builder.add(from, to, misspellMark);
    }
  }
  return builder.finish();
}

export function spellcheckExtension(enabled: boolean) {
  if (!enabled) return [];
  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        constructor(view: EditorView) {
          this.decorations = buildDecos(view);
        }
        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = buildDecos(update.view);
          }
        }
      },
      { decorations: (v) => v.decorations },
    ),
    EditorView.baseTheme({
      ".cm-spell-error": {
        textDecoration: "underline wavy #e06c75",
        textUnderlineOffset: "2px",
      },
    }),
  ];
}
