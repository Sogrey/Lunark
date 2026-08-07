import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { Compartment, type Extension } from "@codemirror/state";

function darkChrome() {
  return EditorView.theme(
    {
      "&": {
        color: "var(--text-color)",
        backgroundColor: "var(--bg-color)",
        height: "100%",
        fontSize: "15px",
      },
      ".cm-content": {
        fontFamily: "var(--font-mono)",
        caretColor: "var(--primary-color)",
        padding: "1.25rem 1rem",
        lineHeight: "1.55",
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--primary-color)",
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        {
          backgroundColor: "var(--select-text-bg-color)",
        },
      ".cm-activeLine": {
        backgroundColor: "rgba(255, 255, 255, 0.04)",
      },
      ".cm-gutters": {
        backgroundColor: "var(--toolbar-bg)",
        color: "var(--control-text-color)",
        border: "none",
        borderRight: "1px solid var(--border-color)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        color: "var(--text-color)",
      },
      ".cm-scroller": {
        overflow: "auto",
        fontFamily: "var(--font-mono)",
      },
      ".cm-matchingbracket": {
        backgroundColor: "rgba(109, 193, 231, 0.25)",
        outline: "1px solid var(--primary-color)",
      },
      ".cm-searchMatch": {
        backgroundColor: "rgba(199, 140, 60, 0.81)",
      },
      ".cm-panels": {
        backgroundColor: "var(--toolbar-bg)",
        color: "var(--text-color)",
      },
      ".cm-panels.cm-panels-top": {
        borderBottom: "1px solid var(--border-color)",
      },
      ".cm-button": {
        background: "var(--side-bar-bg-color)",
        color: "var(--text-color)",
        border: "1px solid var(--border-color)",
      },
      ".cm-textfield": {
        background: "var(--side-bar-bg-color)",
        color: "var(--text-color)",
        border: "1px solid var(--border-color)",
      },
    },
    { dark: true },
  );
}

function lightChrome() {
  return EditorView.theme(
    {
      "&": {
        color: "var(--text-color)",
        backgroundColor: "var(--bg-color)",
        height: "100%",
        fontSize: "15px",
      },
      ".cm-content": {
        fontFamily: "var(--font-mono)",
        caretColor: "var(--primary-color)",
        padding: "1.25rem 1rem",
        lineHeight: "1.55",
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--primary-color)",
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        {
          backgroundColor: "var(--select-text-bg-color)",
          color: "var(--select-text-color)",
        },
      ".cm-activeLine": {
        backgroundColor: "rgba(0, 0, 0, 0.03)",
      },
      ".cm-gutters": {
        backgroundColor: "var(--toolbar-bg)",
        color: "var(--control-text-color)",
        border: "none",
        borderRight: "1px solid var(--border-color)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "rgba(0, 0, 0, 0.05)",
        color: "var(--text-color)",
      },
      ".cm-scroller": {
        overflow: "auto",
        fontFamily: "var(--font-mono)",
      },
      ".cm-matchingbracket": {
        backgroundColor: "rgba(3, 102, 214, 0.18)",
        outline: "1px solid var(--primary-color)",
      },
      ".cm-searchMatch": {
        backgroundColor: "rgba(255, 200, 0, 0.45)",
      },
      ".cm-panels": {
        backgroundColor: "var(--toolbar-bg)",
        color: "var(--text-color)",
      },
      ".cm-panels.cm-panels-top": {
        borderBottom: "1px solid var(--border-color)",
      },
      ".cm-button": {
        background: "var(--side-bar-bg-color)",
        color: "var(--text-color)",
        border: "1px solid var(--border-color)",
      },
      ".cm-textfield": {
        background: "var(--bg-color)",
        color: "var(--text-color)",
        border: "1px solid var(--border-color)",
      },
    },
    { dark: false },
  );
}

const darkHighlight = HighlightStyle.define([
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

const lightHighlight = HighlightStyle.define([
  { tag: t.heading, color: "#111111", fontWeight: "bold" },
  { tag: t.heading1, color: "#111111", fontWeight: "bold" },
  { tag: t.heading2, color: "#111111", fontWeight: "bold" },
  { tag: t.strong, color: "#111111", fontWeight: "bold" },
  { tag: t.emphasis, color: "#333333", fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "#0366d6", textDecoration: "underline" },
  { tag: t.url, color: "#0366d6" },
  { tag: t.meta, color: "#6a737d" },
  { tag: t.comment, color: "#6a737d", fontStyle: "italic" },
  { tag: t.keyword, color: "#d73a49" },
  { tag: t.string, color: "#032f62" },
  { tag: t.number, color: "#005cc5" },
  { tag: t.bool, color: "#005cc5" },
  { tag: t.atom, color: "#005cc5" },
  { tag: t.operator, color: "#24292e" },
  { tag: t.punctuation, color: "#24292e" },
  { tag: t.bracket, color: "#24292e" },
  { tag: t.tagName, color: "#22863a" },
  { tag: t.attributeName, color: "#6f42c1" },
  { tag: t.monospace, color: "#24292e" },
  { tag: t.contentSeparator, color: "#d0d7de" },
]);

export function sourceEditorExtensions(dark: boolean): Extension[] {
  return [
    dark ? darkChrome() : lightChrome(),
    syntaxHighlighting(dark ? darkHighlight : lightHighlight),
  ];
}

/** @deprecated 仅兼容旧引用；请用 createSourceThemeCompartment */
export const nightEditorTheme = darkChrome();
/** @deprecated 仅兼容旧引用；请用 createSourceThemeCompartment */
export const nightSyntax = syntaxHighlighting(darkHighlight);

export function createSourceThemeCompartment(dark: boolean) {
  const compartment = new Compartment();
  return {
    initial: compartment.of(sourceEditorExtensions(dark)),
    setDark(view: EditorView, nextDark: boolean) {
      view.dispatch({
        effects: compartment.reconfigure(sourceEditorExtensions(nextDark)),
      });
    },
  };
}
