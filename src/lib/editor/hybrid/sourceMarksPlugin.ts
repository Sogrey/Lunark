import { $prose } from "@milkdown/kit/utils";
import {
  NodeSelection,
  Plugin,
  TextSelection,
  type EditorState,
} from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet, type EditorView } from "@milkdown/kit/prose/view";
import {
  clearImageSourceCache,
  getOrCreateImageSourceRow,
  selectedImage,
} from "./imageSource";
import {
  clearMathSourceCache,
  getOrCreateMathSourceRow,
  selectedInlineMath,
} from "./mathSource";
import {
  clearPreviewBlockSourceCache,
  getOrCreatePreviewBlockSourceRow,
  isPreviewFirstCodeBlock,
  selectedPreviewBlock,
  syncPreviewFirstDom,
} from "./previewBlockSource";
import { collectInlineMarkDecorations } from "./inlineMarks";
import {
  collectEmptyHeadingDecorations,
  collectHeadingDecoration,
} from "./headings";
import { hybridSourceMarksKey } from "./pluginKey";

function buildDecorations(
  state: EditorState,
  view?: EditorView | null,
): DecorationSet {
  const decos: Decoration[] = [];

  const image = selectedImage(state);
  if (image && view) {
    const { pos, node } = image;
    decos.push(
      Decoration.widget(
        pos,
        () => getOrCreateImageSourceRow(view, pos, node),
        { side: -1, key: `lunark-img-src-${pos}` },
      ),
    );
  } else if (!image) {
    clearImageSourceCache();
  }

  const math = selectedInlineMath(state);
  if (math && view) {
    const { pos, node } = math;
    decos.push(
      Decoration.widget(
        pos,
        () => getOrCreateMathSourceRow(view, pos, node),
        { side: -1, key: `lunark-math-src-${pos}` },
      ),
    );
  } else if (!math) {
    clearMathSourceCache();
  }

  const previewBlock = selectedPreviewBlock(state);
  if (previewBlock && view) {
    const { pos, node } = previewBlock;
    decos.push(
      Decoration.widget(
        pos,
        () => getOrCreatePreviewBlockSourceRow(view, pos, node),
        { side: -1, key: `lunark-preview-src-${pos}` },
      ),
    );
  } else if (!previewBlock) {
    clearPreviewBlockSourceCache();
  }

  decos.push(...collectInlineMarkDecorations(state));
  decos.push(...collectHeadingDecoration(state));
  decos.push(...collectEmptyHeadingDecorations(state));

  return DecorationSet.create(state.doc, decos);
}

/**
 * 混合模式局部露出 Markdown 语法糖（对标 Typora）：
 * - 选中图片 / 行内公式 / 块级公式·Mermaid：上方可编辑源码，下方仍渲染
 * - 光标在行内 mark / 链接 / 标题内：显示分隔符
 * - 空标题：始终显示 `#`
 */
export function lunarkHybridSourceMarks() {
  return $prose(() => {
    let editorView: EditorView | null = null;
    return new Plugin({
      key: hybridSourceMarksKey,
      view(view) {
        editorView = view;
        syncPreviewFirstDom(view);
        return {
          update() {
            syncPreviewFirstDom(view);
          },
          destroy() {
            editorView = null;
            clearImageSourceCache();
            clearMathSourceCache();
            clearPreviewBlockSourceCache();
          },
        };
      },
      props: {
        decorations(state) {
          return buildDecorations(state, editorView);
        },
        handleClickOn(view, _pos, node, nodePos, event, direct) {
          if (!direct || !isPreviewFirstCodeBlock(node)) return false;
          const target = event.target as HTMLElement | null;
          if (target?.closest(".lunark-md-preview-source")) return false;
          const sel = NodeSelection.create(view.state.doc, nodePos);
          view.dispatch(view.state.tr.setSelection(sel));
          return true;
        },
        handleDoubleClickOn(view, _pos, node, nodePos) {
          if (!isPreviewFirstCodeBlock(node)) return false;
          const inner = nodePos + 1;
          view.dispatch(
            view.state.tr.setSelection(
              TextSelection.create(view.state.doc, inner),
            ),
          );
          return true;
        },
      },
    });
  });
}
