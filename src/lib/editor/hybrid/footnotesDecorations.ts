import { TextSelection, type EditorState } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { Decoration } from "@milkdown/kit/prose/view";

/** 行内脚注引用 `[^id]`（不含定义行；含 hybrid ZWSP 保护） */
const FN_REF_RE = /\[\^([^\]]+)\](?!\s*\u200B?[:：])/g;

/** 整段为脚注定义：`[^id]: …` / ZWSP 保护 / 全角冒号 */
const FN_DEF_LINE_RE = /^\s*\[\^[^\]]+\]\s*\u200B?[:：]/;

const SUP_DIGITS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

function superscriptLabel(id: string): string {
  if (/^\d+$/.test(id)) {
    return [...id].map((c) => SUP_DIGITS[c] ?? c).join("");
  }
  return id;
}

function isNearFootnote(
  caret: number | null,
  selFrom: number,
  selTo: number,
  from: number,
  to: number,
): boolean {
  if (caret != null && caret >= from - 2 && caret <= to + 2) return true;
  if (selFrom < to && selTo > from) return true;
  return false;
}

/**
 * 阅读态：隐藏 `[^id]`，显示上标；
 * 光标在引用内或紧贴前后 / 选区相交：露出源码便于编辑。
 * 定义行整段跳过，避免把 `[^1]: 正文` 拆成上标 + 换行正文。
 */
export function collectFootnoteDecorations(state: EditorState): Decoration[] {
  const { selection } = state;
  const caret = selection.empty ? selection.from : null;
  const selFrom = selection.from;
  const selTo = selection.to;
  const out: Decoration[] = [];

  state.doc.descendants((node, pos) => {
    if (!node.isTextblock || node.type.spec.code) return true;
    if (node.type.name === "code_block") return true;

    const text = node.textContent;
    if (!text.includes("[^")) return true;
    // 定义行保持源码，不做上标
    if (FN_DEF_LINE_RE.test(text)) return true;

    const base = pos + 1;
    FN_REF_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = FN_REF_RE.exec(text)) !== null) {
      const id = m[1] ?? "";
      if (!id) continue;
      const from = base + m.index;
      const to = from + m[0].length;

      if (isNearFootnote(caret, selFrom, selTo, from, to)) continue;

      out.push(
        Decoration.inline(from, to, { class: "lunark-fn-hide" }),
        Decoration.widget(
          from,
          () => {
            const el = document.createElement("sup");
            el.className = "lunark-fn-sup";
            el.textContent = superscriptLabel(id);
            el.title = `[^${id}]`;
            el.contentEditable = "false";
            el.dataset.fnFrom = String(from);
            el.dataset.fnTo = String(to);
            return el;
          },
          { side: -1, key: `lunark-fn-sup-${from}` },
        ),
      );
    }
    return true;
  });

  return out;
}

/** 点击上标 → 光标进入 `[^id]`，装饰卸下后即可编辑 */
export function handleFootnoteSupMouseDown(
  view: EditorView,
  event: MouseEvent,
): boolean {
  const t = event.target as HTMLElement | null;
  const sup = t?.closest?.(".lunark-fn-sup") as HTMLElement | null;
  if (!sup || !view.dom.contains(sup)) return false;

  const from = Number(sup.dataset.fnFrom);
  if (!Number.isFinite(from)) return false;

  event.preventDefault();
  event.stopPropagation();

  const inner = Math.min(from + 2, view.state.doc.content.size);
  try {
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, inner)),
    );
    view.focus();
  } catch {
    /* ignore */
  }
  return true;
}
