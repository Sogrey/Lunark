import type { Crepe } from "@milkdown/crepe";
import { editorViewCtx } from "@milkdown/kit/core";
import { undo as pmUndo, redo as pmRedo } from "@milkdown/kit/prose/history";
import type { Node as PmNode } from "@milkdown/kit/prose/model";
import { AllSelection, TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import type { FormatBridge } from "@/lib/editor/formatBridge";
import {
  applyPmCodeBlockHighlight,
  inspectPmCodeBlockHighlight,
} from "@/lib/editor/codeBlockHighlight";
import {
  insertCrepeCodeBlock,
  runCrepeBlockAction,
  runCrepeMarkAction,
  type CrepeBlockAction,
} from "@/lib/editor/crepeCommands";
import { parseContainerInsert } from "@/lib/markdown/containerHybrid";
import { isFootnoteSnippet } from "@/lib/markdown/footnotes";
import { t } from "@/lib/i18n";

function withView(crepe: Crepe, fn: (view: EditorView) => void) {
  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    fn(view);
  });
}

/**
 * 把含空行的纯文本片段拆成多个 paragraph 插入。
 * 脚注等不能用 insertText("\\n\\n")——换行会挤在同一段里，编辑后并成一行。
 */
function insertPlainParagraphs(
  view: EditorView,
  md: string,
  opts?: { selectFootnoteId?: boolean },
) {
  const { state, dispatch } = view;
  const paraType = state.schema.nodes.paragraph;
  const normalized = md
    .replace(/\r\n/g, "\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
  const chunks = normalized.split(/\n{2,}/).map((c) => c.replace(/\n/g, " "));

  if (!paraType || chunks.length <= 1) {
    const text = md.endsWith("\n") ? md : `${md}\n`;
    dispatch(
      state.tr.insertText(text, state.selection.from, state.selection.to),
    );
    view.focus();
    return;
  }

  const toPara = (text: string): PmNode | null => {
    const line = text.trimEnd();
    if (!line) return paraType.createAndFill();
    return paraType.create(null, state.schema.text(line));
  };

  const { from, to } = state.selection;
  let tr = state.tr;
  if (from !== to) tr = tr.delete(from, to);

  const first = chunks[0] ?? "";
  const insertFrom = tr.selection.from;
  if (first) {
    tr = tr.insertText(first, insertFrom);
  }

  let insertAt = tr.selection.$from.after(tr.selection.$from.depth);
  for (const chunk of chunks.slice(1)) {
    const node = toPara(chunk);
    if (!node) continue;
    tr = tr.insert(insertAt, node);
    insertAt += node.nodeSize;
  }

  if (opts?.selectFootnoteId && first) {
    const m = first.match(/^\[\^([^\]]+)\]/);
    if (m?.[1]) {
      const idStart = insertFrom + 2;
      const idEnd = idStart + m[1].length;
      try {
        tr = tr.setSelection(TextSelection.create(tr.doc, idStart, idEnd));
      } catch {
        /* ignore */
      }
    }
  }

  dispatch(tr.scrollIntoView());
  view.focus();
}

export function createHybridFormatBridge(
  getCrepe: () => Crepe | null,
): FormatBridge {
  function crepe(): Crepe {
    const c = getCrepe();
    if (!c) throw new Error(t("msg.editorNotReady"));
    return c;
  }

  return {
    wrapInline(before, after = before) {
      // 优先走与选区工具条相同的 mark 命令
      if (before === "**" && after === "**") {
        runCrepeMarkAction(crepe(), "strong");
        return;
      }
      if (before === "*" && after === "*") {
        runCrepeMarkAction(crepe(), "emphasis");
        return;
      }
      if (before === "`" && after === "`") {
        runCrepeMarkAction(crepe(), "inlineCode");
        return;
      }
      if (before === "[" && after.startsWith("](")) {
        runCrepeMarkAction(crepe(), "link");
        return;
      }
      runCrepeMarkAction(crepe(), "strong");
    },

    toggleLinePrefix(prefix) {
      const p = typeof prefix === "function" ? prefix(0) : prefix;
      if (p.startsWith("> ")) {
        runCrepeBlockAction(crepe(), "quote");
        return;
      }
      if (p === "- " || p === "* ") {
        runCrepeBlockAction(crepe(), "bulletList");
        return;
      }
      if (/^\d+\.\s/.test(p)) {
        runCrepeBlockAction(crepe(), "orderedList");
        return;
      }
      if (p.startsWith("- [")) {
        runCrepeBlockAction(crepe(), "taskList");
        return;
      }
    },

    setHeading(level) {
      if (level === 0) {
        runCrepeBlockAction(crepe(), "paragraph");
        return;
      }
      runCrepeBlockAction(crepe(), `h${level}` as CrepeBlockAction);
    },

    runBlockAction(action) {
      // 与「+」同源命令；右键不 clear，避免抹掉当前段落文字
      runCrepeBlockAction(crepe(), action, { clearFirst: false });
    },

    toggleMark(action) {
      runCrepeMarkAction(crepe(), action);
    },

    insertSnippet(md) {
      // 已知块优先走 Crepe 命令；真实图片 Markdown 直接插入文本（勿改成空图块）
      const trimmed = md.trim();
      // ::: / 容器围栏 → 真正的 code_block（语言=kind），才能立刻 renderPreview
      const container = parseContainerInsert(md);
      if (container) {
        insertCrepeCodeBlock(crepe(), container.kind, container.body);
        return;
      }
      if (trimmed.startsWith("```") && trimmed.includes("LaTeX")) {
        runCrepeBlockAction(crepe(), "math");
        return;
      }
      if (trimmed.startsWith("```")) {
        runCrepeBlockAction(crepe(), "codeBlock");
        return;
      }
      if (trimmed.startsWith("|")) {
        runCrepeBlockAction(crepe(), "table");
        return;
      }
      if (trimmed === "---") {
        runCrepeBlockAction(crepe(), "hr");
        return;
      }
      if (trimmed.startsWith("$$")) {
        runCrepeBlockAction(crepe(), "math");
        return;
      }
      // 脚注 / 多段片段：按 paragraph 插入，避免 \\n\\n 落在同一段
      if (/\n\s*\n/.test(md)) {
        withView(crepe(), (view) =>
          insertPlainParagraphs(view, md, {
            selectFootnoteId: isFootnoteSnippet(md),
          }),
        );
        return;
      }
      withView(crepe(), (view) => {
        const { state, dispatch } = view;
        const { from, to } = state.selection;
        const text = md.endsWith("\n") ? md : `${md}\n`;
        dispatch(state.tr.insertText(text, from, to));
        view.focus();
      });
    },

    getMarkdown() {
      try {
        return crepe().getMarkdown();
      } catch {
        return "";
      }
    },

    deleteSelection() {
      withView(crepe(), (view) => {
        const { state, dispatch } = view;
        const { from, to } = state.selection;
        if (from === to) return;
        dispatch(state.tr.delete(from, to));
        view.focus();
      });
    },

    getSelectedText() {
      let text = "";
      const c = getCrepe();
      if (!c) return window.getSelection()?.toString() ?? "";
      withView(c, (view) => {
        const { from, to } = view.state.selection;
        text = view.state.doc.textBetween(from, to, "\n");
      });
      return text;
    },

    replaceSelection(text) {
      withView(crepe(), (view) => {
        const { state, dispatch } = view;
        const { from, to } = state.selection;
        dispatch(state.tr.insertText(text, from, to));
        view.focus();
      });
    },

    focus() {
      const c = getCrepe();
      if (!c) return;
      withView(c, (view) => view.focus());
    },

    selectAll() {
      withView(crepe(), (view) => {
        const { state, dispatch } = view;
        // AllSelection 只覆盖文档，不会选中标签栏等壳层 DOM
        dispatch(state.tr.setSelection(new AllSelection(state.doc)));
        view.focus();
      });
    },

    undo() {
      withView(crepe(), (view) => {
        pmUndo(view.state, view.dispatch);
        view.focus();
      });
    },

    redo() {
      withView(crepe(), (view) => {
        pmRedo(view.state, view.dispatch);
        view.focus();
      });
    },

    inspectCodeBlockHighlight() {
      let state = null as ReturnType<typeof inspectPmCodeBlockHighlight>;
      const c = getCrepe();
      if (!c) return null;
      withView(c, (view) => {
        state = inspectPmCodeBlockHighlight(view);
      });
      return state;
    },

    applyCodeBlockHighlight(lines) {
      let ok = false;
      withView(crepe(), (view) => {
        ok = applyPmCodeBlockHighlight(view, lines);
      });
      return ok;
    },
  };
}
