import type { EditorView } from "@codemirror/view";

/** 在光标（或选区）处插入文本；无 view 时返回 false。 */
export function insertTextAtCursor(view: EditorView, text: string): boolean {
  if (!text) return false;
  const { from, to } = view.state.selection.main;
  const before = from > 0 ? view.state.doc.sliceString(from - 1, from) : "\n";
  const after =
    to < view.state.doc.length ? view.state.doc.sliceString(to, to + 1) : "\n";

  let insert = text;
  if (before !== "\n" && !insert.startsWith("\n")) insert = `\n${insert}`;
  if (after !== "\n" && !insert.endsWith("\n")) insert = `${insert}\n`;

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    scrollIntoView: true,
  });
  view.focus();
  return true;
}

/** 多张图片 Markdown 拼成一段插入文本 */
export function joinImageSnippets(snippets: string[]): string {
  if (snippets.length === 0) return "";
  return snippets.join("\n\n");
}
