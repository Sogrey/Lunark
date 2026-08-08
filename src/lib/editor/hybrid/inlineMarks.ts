import type { Mark, MarkType, Node as PmNode } from "@milkdown/kit/prose/model";
import { NodeSelection, type EditorState } from "@milkdown/kit/prose/state";
import { Decoration } from "@milkdown/kit/prose/view";
import { MARK_DELIMS } from "./constants";
import { createMarkChip } from "./sourceRowUi";

function findMarkRange(
  doc: PmNode,
  pos: number,
  type: MarkType,
): { from: number; to: number } | null {
  const $pos = doc.resolve(pos);
  const { parent, parentOffset } = $pos;
  if (!parent.isTextblock) return null;

  const start = $pos.start();
  const childAfter = parent.childAfter(parentOffset);
  let probe: Mark | undefined;

  if (childAfter.node) {
    probe = type.isInSet(childAfter.node.marks) ?? undefined;
  }
  if (!probe && parentOffset > 0) {
    const before = parent.childBefore(parentOffset);
    if (before.node) {
      probe = type.isInSet(before.node.marks) ?? undefined;
    }
  }
  if (!probe) return null;

  let startIndex = $pos.index();
  if (!childAfter.node && startIndex > 0) {
    startIndex -= 1;
  }
  let endIndex = startIndex + 1;

  let from = start;
  for (let i = 0; i < startIndex; i++) from += parent.child(i)!.nodeSize;
  let to = from + parent.child(startIndex)!.nodeSize;

  while (
    startIndex > 0 &&
    probe.isInSet(parent.child(startIndex - 1)!.marks)
  ) {
    startIndex -= 1;
    from -= parent.child(startIndex)!.nodeSize;
  }
  while (
    endIndex < parent.childCount &&
    probe.isInSet(parent.child(endIndex)!.marks)
  ) {
    to += parent.child(endIndex)!.nodeSize;
    endIndex += 1;
  }
  return { from, to };
}

function linkCloseDelim(mark: Mark): string {
  const href = String(mark.attrs.href ?? "");
  const title = mark.attrs.title ? String(mark.attrs.title) : "";
  if (title) return `](${href} "${title}")`;
  return `](${href})`;
}

function nearbyMarks(state: EditorState): Mark[] {
  const $pos = state.selection.$from;
  const found = new Map<string, Mark>();
  const add = (marks: readonly Mark[]) => {
    for (const mark of marks) {
      if (mark.type.name === "link" || MARK_DELIMS[mark.type.name]) {
        found.set(`${mark.type.name}|${JSON.stringify(mark.attrs)}`, mark);
      }
    }
  };
  add($pos.marks());
  const { parent, parentOffset } = $pos;
  if (parentOffset > 0) {
    const before = parent.childBefore(parentOffset);
    if (before.node?.isText) add(before.node.marks);
  }
  if (parentOffset < parent.content.size) {
    const after = parent.childAfter(parentOffset);
    if (after.node?.isText) add(after.node.marks);
  }
  return [...found.values()];
}

/** 光标在 mark 内或紧贴前后时露出语法糖 */
export function collectInlineMarkDecorations(state: EditorState): Decoration[] {
  const { selection } = state;
  if (!selection.empty) return [];
  if (selection instanceof NodeSelection) return [];

  const $from = selection.$from;
  if ($from.parent.type.name === "code_block" || $from.parent.type.spec.code) {
    return [];
  }

  const marks = nearbyMarks(state);
  const out: Decoration[] = [];
  const seen = new Set<string>();

  for (const mark of marks) {
    const range =
      findMarkRange(state.doc, $from.pos, mark.type) ??
      ($from.pos > 0
        ? findMarkRange(state.doc, $from.pos - 1, mark.type)
        : null) ??
      findMarkRange(state.doc, $from.pos + 1, mark.type);
    if (!range) continue;
    if ($from.pos < range.from || $from.pos > range.to) continue;
    const key = `${mark.type.name}:${range.from}:${range.to}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (mark.type.name === "link") {
      out.push(
        Decoration.widget(range.from, () => createMarkChip("["), {
          side: -1,
          key: `lunark-open-${key}`,
        }),
        Decoration.widget(
          range.to,
          () => {
            const el = createMarkChip(linkCloseDelim(mark));
            el.classList.add("lunark-md-link-close");
            return el;
          },
          { side: 1, key: `lunark-close-${key}` },
        ),
      );
      continue;
    }

    const delim = MARK_DELIMS[mark.type.name];
    if (!delim) continue;
    const [open, close] = delim;
    out.push(
      Decoration.widget(range.from, () => createMarkChip(open), {
        side: -1,
        key: `lunark-open-${key}`,
      }),
      Decoration.widget(range.to, () => createMarkChip(close), {
        side: 1,
        key: `lunark-close-${key}`,
      }),
    );
  }
  return out;
}
