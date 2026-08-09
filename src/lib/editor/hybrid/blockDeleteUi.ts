import type { Node as PmNode } from "@milkdown/kit/prose/model";
import { TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { t } from "@/lib/i18n";

/** 垃圾桶图标（源码条右侧） */
export const TRASH_ICON_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';

/** 源码编辑条右侧删除按钮 */
export function createTrashDeleteButton(onDelete: () => void): HTMLElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "lunark-md-source-delete";
  btn.title = t("editor.delete");
  btn.setAttribute("aria-label", t("editor.delete"));
  btn.contentEditable = "false";
  btn.tabIndex = -1;
  btn.innerHTML = TRASH_ICON_SVG;
  const kill = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete();
  };
  btn.addEventListener("mousedown", kill);
  btn.addEventListener("click", kill);
  btn.addEventListener("pointerdown", (e) => e.stopPropagation());
  return btn;
}

/** 删除指定位置节点，光标落在附近 */
export function deleteNodeAt(
  view: EditorView,
  pos: number,
  accept: (node: PmNode) => boolean,
  after?: () => void,
) {
  const node = view.state.doc.nodeAt(pos);
  if (!node || !accept(node)) return;
  const from = pos;
  const to = pos + node.nodeSize;
  let tr = view.state.tr.delete(from, to);
  const selPos = Math.min(from, tr.doc.content.size);
  tr = tr
    .setSelection(TextSelection.near(tr.doc.resolve(selPos)))
    .scrollIntoView();
  view.dispatch(tr);
  after?.();
  view.focus();
}
