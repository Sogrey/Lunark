import type { Node as PmNode } from "@milkdown/kit/prose/model";
import { NodeSelection, type EditorState } from "@milkdown/kit/prose/state";
import { Decoration } from "@milkdown/kit/prose/view";
import { createMarkChip } from "./sourceRowUi";

function headingHashes(level: number): string {
  return "#".repeat(Math.min(6, Math.max(1, level))) + " ";
}

function isBlankHeading(node: PmNode): boolean {
  if (node.type.name !== "heading") return false;
  return node.textContent.trim().length === 0;
}

export function collectHeadingDecoration(state: EditorState): Decoration[] {
  const { selection } = state;
  if (selection instanceof NodeSelection) return [];
  const $from = selection.$from;
  const parent = $from.parent;
  if (parent.type.name !== "heading") return [];
  if (isBlankHeading(parent)) return [];
  const level = Number(parent.attrs.level ?? 1);
  const hashes = headingHashes(level);
  const pos = $from.start();
  return [
    Decoration.widget(
      pos,
      () => {
        const el = createMarkChip(hashes);
        el.classList.add("lunark-md-heading-mark");
        return el;
      },
      { side: -1, key: `lunark-h-${pos}-${level}` },
    ),
  ];
}

/** 空标题（无有效正文）始终露出 `#` */
export function collectEmptyHeadingDecorations(
  state: EditorState,
): Decoration[] {
  const out: Decoration[] = [];
  state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return true;
    if (!isBlankHeading(node)) return true;
    const level = Number(node.attrs.level ?? 1);
    const hashes = headingHashes(level);
    const contentStart = pos + 1;
    out.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: "lunark-empty-heading-block",
        "data-lunark-h-level": String(level),
      }),
    );
    out.push(
      Decoration.widget(
        contentStart,
        () => {
          const el = createMarkChip(hashes);
          el.classList.add("lunark-md-heading-mark", "lunark-md-empty-heading");
          return el;
        },
        { side: -1, key: `lunark-empty-h-${pos}-${level}` },
      ),
    );
    return true;
  });
  return out;
}
