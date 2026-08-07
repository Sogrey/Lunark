import type { Crepe } from "@milkdown/crepe";
import { editorViewCtx } from "@milkdown/kit/core";
import type { EditorView } from "@milkdown/kit/prose/view";
import type { FormatBridge } from "@/lib/editor/formatBridge";
import {
  runCrepeBlockAction,
  runCrepeMarkAction,
  type CrepeBlockAction,
} from "@/lib/editor/crepeCommands";

function withView(crepe: Crepe, fn: (view: EditorView) => void) {
  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    fn(view);
  });
}

export function createHybridFormatBridge(
  getCrepe: () => Crepe | null,
): FormatBridge {
  function crepe(): Crepe {
    const c = getCrepe();
    if (!c) throw new Error("编辑器未就绪");
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
      // 已知块优先走 Crepe 命令
      const trimmed = md.trim();
      if (trimmed.startsWith("![") || trimmed.includes("./assets/")) {
        runCrepeBlockAction(crepe(), "image");
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
      withView(crepe(), (view) => {
        const { state, dispatch } = view;
        const { from, to } = state.selection;
        const text = md.endsWith("\n") ? md : `${md}\n`;
        dispatch(state.tr.insertText(text, from, to));
        view.focus();
      });
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
  };
}
