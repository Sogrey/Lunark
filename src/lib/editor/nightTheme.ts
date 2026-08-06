import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/** CodeMirror Night 源码主题（Lunark Night 色板） */
export const nightEditorTheme = EditorView.theme(
  {
    "&": {
      color: "#b8bfc6",
      backgroundColor: "#363b40",
      height: "100%",
      fontSize: "15px",
    },
    ".cm-content": {
      fontFamily:
        'Monaco, Consolas, "Andale Mono", "DejaVu Sans Mono", monospace',
      caretColor: "#6dc1e7",
      padding: "1.25rem 1rem",
      lineHeight: "1.55",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#6dc1e7",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "#4a89dc",
      },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.04)",
    },
    ".cm-gutters": {
      backgroundColor: "#32363b",
      color: "#8C8E92",
      border: "none",
      borderRight: "1px solid #474d54",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.06)",
      color: "#b8bfc6",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily:
        'Monaco, Consolas, "Andale Mono", "DejaVu Sans Mono", monospace',
    },
    ".cm-matchingbracket": {
      backgroundColor: "rgba(109, 193, 231, 0.25)",
      outline: "1px solid #6dc1e7",
    },
    ".cm-searchMatch": {
      backgroundColor: "rgba(199, 140, 60, 0.81)",
    },
    ".cm-panels": {
      backgroundColor: "#32363b",
      color: "#b8bfc6",
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: "1px solid #555",
    },
    ".cm-button": {
      background: "#42464a",
      color: "#b8bfc6",
      border: "1px solid #555",
    },
    ".cm-textfield": {
      background: "#2e3033",
      color: "#b8bfc6",
      border: "1px solid #555",
    },
  },
  { dark: true },
);

export const nightHighlightStyle = HighlightStyle.define([
  { tag: t.heading, color: "#DEDEDE", fontWeight: "bold" },
  { tag: t.heading1, color: "#DEDEDE", fontWeight: "bold" },
  { tag: t.heading2, color: "#DEDEDE", fontWeight: "bold" },
  { tag: t.strong, color: "#DEDEDE", fontWeight: "bold" },
  { tag: t.emphasis, color: "#b8bfc6", fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "#e0e0e0", textDecoration: "underline" },
  { tag: t.url, color: "#6dc1e7" },
  { tag: t.meta, color: "#8C8E92" },
  { tag: t.comment, color: "#5a95e3", fontStyle: "italic" },
  { tag: t.keyword, color: "#6dc1e7" },
  { tag: t.string, color: "#98c379" },
  { tag: t.number, color: "#d19a66" },
  { tag: t.bool, color: "#d19a66" },
  { tag: t.atom, color: "#d19a66" },
  { tag: t.operator, color: "#b8bfc6" },
  { tag: t.punctuation, color: "#8C8E92" },
  { tag: t.bracket, color: "#8C8E92" },
  { tag: t.tagName, color: "#e06c75" },
  { tag: t.attributeName, color: "#d19a66" },
  { tag: t.monospace, color: "#b8bfc6" },
  { tag: t.contentSeparator, color: "#474d54" },
]);

export const nightSyntax = syntaxHighlighting(nightHighlightStyle);
