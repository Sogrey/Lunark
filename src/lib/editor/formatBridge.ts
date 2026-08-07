import type { EditorView as CmView } from "@codemirror/view";
import type {
  CrepeBlockAction,
  CrepeMarkAction,
} from "@/lib/editor/crepeCommands";

/** 编辑器格式化桥：源码 CM 与混合 Crepe 共用 */
export interface FormatBridge {
  wrapInline: (before: string, after?: string, placeholder?: string) => void;
  /** 给选中行加/切换行前缀（如 `> `、`- `、`1. `） */
  toggleLinePrefix: (prefix: string | ((i: number) => string)) => void;
  setHeading: (level: 0 | 1 | 2 | 3 | 4 | 5 | 6) => void;
  /** 与行首「+」同源的块动作（混合走 Crepe 命令；源码走 Markdown） */
  runBlockAction: (action: CrepeBlockAction) => void;
  toggleMark: (action: CrepeMarkAction) => void;
  insertSnippet: (md: string, selectPlaceholder?: boolean) => void;
  deleteSelection: () => void;
  getSelectedText: () => string;
  replaceSelection: (text: string) => void;
  focus: () => void;
}

let bridge: FormatBridge | null = null;

export function setFormatBridge(next: FormatBridge | null) {
  bridge = next;
}

/** 仅当仍是当前桥时清除，避免 hybrid↔source 切换时误清对方刚注册的桥 */
export function clearFormatBridge(expected: FormatBridge) {
  if (bridge === expected) bridge = null;
}

export function getFormatBridge(): FormatBridge | null {
  return bridge;
}

function cmBlockAction(
  action: CrepeBlockAction,
  helpers: {
    setHeading: (level: 0 | 1 | 2 | 3 | 4 | 5 | 6) => void;
    toggleLinePrefix: (prefix: string | ((i: number) => string)) => void;
    insertSnippet: (md: string) => void;
  },
) {
  switch (action) {
    case "paragraph":
      helpers.setHeading(0);
      break;
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      helpers.setHeading(Number(action.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6);
      break;
    case "quote":
      helpers.toggleLinePrefix("> ");
      break;
    case "hr":
      helpers.insertSnippet("---");
      break;
    case "bulletList":
      helpers.toggleLinePrefix("- ");
      break;
    case "orderedList":
      helpers.toggleLinePrefix((i) => `${i + 1}. `);
      break;
    case "taskList":
      helpers.toggleLinePrefix("- [ ] ");
      break;
    case "image":
      helpers.insertSnippet("![描述](./assets/image.png)");
      break;
    case "codeBlock":
      helpers.insertSnippet("```\n\n```");
      break;
    case "table":
      helpers.insertSnippet(
        "| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |",
      );
      break;
    case "math":
      helpers.insertSnippet("$$\n\n$$");
      break;
    default:
      break;
  }
}

export function createCmFormatBridge(
  getView: () => CmView | null,
): FormatBridge {
  function view(): CmView {
    const v = getView();
    if (!v) throw new Error("编辑器未就绪");
    return v;
  }

  const api: FormatBridge = {
    wrapInline(before, after = before, placeholder = "文本") {
      const v = view();
      const { from, to } = v.state.selection.main;
      const selected = v.state.doc.sliceString(from, to);
      const inner = selected || placeholder;
      const insert = `${before}${inner}${after}`;
      const anchor = from + before.length;
      const head = anchor + inner.length;
      v.dispatch({
        changes: { from, to, insert },
        selection: { anchor, head },
        scrollIntoView: true,
      });
      v.focus();
    },

    toggleLinePrefix(prefix) {
      const v = view();
      const { from, to } = v.state.selection.main;
      const startLine = v.state.doc.lineAt(from);
      const endLine = v.state.doc.lineAt(to);
      const changes: { from: number; to: number; insert: string }[] = [];
      let lineIndex = 0;
      for (let n = startLine.number; n <= endLine.number; n++) {
        const line = v.state.doc.line(n);
        const p = typeof prefix === "function" ? prefix(lineIndex) : prefix;
        lineIndex += 1;
        const text = line.text;
        const heading = text.match(/^#{1,6}\s+/);
        const stripped = heading ? text.slice(heading[0].length) : text;
        if (stripped.startsWith(p)) {
          changes.push({
            from: line.from,
            to: line.from + p.length + (heading ? heading[0].length : 0),
            insert: heading ? heading[0] : "",
          });
        } else if (
          /^[-*+]\s+/.test(stripped) ||
          /^\d+\.\s+/.test(stripped) ||
          /^>\s?/.test(stripped) ||
          /^-\s+\[[ xX]\]\s+/.test(stripped)
        ) {
          const cleaned = stripped.replace(
            /^([-*+]\s+(\[[ xX]\]\s+)?|>\s?|\d+\.\s+)/,
            "",
          );
          changes.push({
            from: line.from,
            to: line.to,
            insert: (heading ? heading[0] : "") + p + cleaned,
          });
        } else {
          changes.push({
            from: line.from,
            to: line.from,
            insert: p,
          });
        }
      }
      v.dispatch({ changes, scrollIntoView: true });
      v.focus();
    },

    setHeading(level) {
      const v = view();
      const { from, to } = v.state.selection.main;
      const startLine = v.state.doc.lineAt(from);
      const endLine = v.state.doc.lineAt(to);
      const prefix = level === 0 ? "" : "#".repeat(level) + " ";
      const changes: { from: number; to: number; insert: string }[] = [];
      for (let n = startLine.number; n <= endLine.number; n++) {
        const line = v.state.doc.line(n);
        const body = line.text.replace(/^#{1,6}\s+/, "");
        changes.push({
          from: line.from,
          to: line.to,
          insert: prefix + body,
        });
      }
      v.dispatch({ changes, scrollIntoView: true });
      v.focus();
    },

    runBlockAction(action) {
      cmBlockAction(action, {
        setHeading: (l) => api.setHeading(l),
        toggleLinePrefix: (p) => api.toggleLinePrefix(p),
        insertSnippet: (md) => api.insertSnippet(md),
      });
      getView()?.focus();
    },

    toggleMark(action: CrepeMarkAction) {
      switch (action) {
        case "strong":
          api.wrapInline("**", "**");
          break;
        case "emphasis":
          api.wrapInline("*", "*");
          break;
        case "inlineCode":
          api.wrapInline("`", "`");
          break;
        case "link":
          api.wrapInline("[", "](https://)", "链接文字");
          break;
        default:
          break;
      }
    },

    insertSnippet(md) {
      const v = view();
      const { from, to } = v.state.selection.main;
      const before = from > 0 ? v.state.doc.sliceString(from - 1, from) : "\n";
      let insert = md;
      if (before !== "\n" && !insert.startsWith("\n")) insert = `\n${insert}`;
      if (!insert.endsWith("\n")) insert = `${insert}\n`;
      v.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + insert.length },
        scrollIntoView: true,
      });
      v.focus();
    },

    deleteSelection() {
      const v = view();
      const { from, to } = v.state.selection.main;
      if (from === to) return;
      v.dispatch({
        changes: { from, to, insert: "" },
        selection: { anchor: from },
      });
      v.focus();
    },

    getSelectedText() {
      const v = getView();
      if (!v) return "";
      const { from, to } = v.state.selection.main;
      return v.state.doc.sliceString(from, to);
    },

    replaceSelection(text) {
      const v = view();
      const { from, to } = v.state.selection.main;
      v.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
        scrollIntoView: true,
      });
      v.focus();
    },

    focus() {
      getView()?.focus();
    },
  };

  return api;
}
