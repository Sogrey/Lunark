<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import {
  keymap,
  lineNumbers,
  highlightActiveLine,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  search,
  findNext,
  findPrevious,
  selectNextOccurrence,
  highlightSelectionMatches,
} from "@codemirror/search";
import { bracketMatching } from "@codemirror/language";
import { createSourceThemeCompartment } from "@/lib/editor/nightTheme";
import { imageInputExtension } from "@/lib/editor/imageInput";
import { createTypewriterCompartment } from "@/lib/editor/typewriterCm";
import {
  getTabEditorState,
  setTabEditorState,
} from "@/lib/editor/tabEditorStates";
import { useEditorStore } from "@/stores/editor";
import { useTabsStore } from "@/stores/tabs";
import { useThemeStore } from "@/stores/theme";
import {
  clearFormatBridge,
  createCmFormatBridge,
  setFormatBridge,
} from "@/lib/editor/formatBridge";

const editor = useEditorStore();
const tabs = useTabsStore();
const theme = useThemeStore();
const host = ref<HTMLElement | null>(null);

let view: EditorView | null = null;
let applyingExternal = false;

const typewriter = createTypewriterCompartment();
const sourceTheme = createSourceThemeCompartment(theme.isDark);
const cmBridge = createCmFormatBridge(() => view);

const extensions = [
  markdown(),
  lineNumbers(),
  highlightActiveLine(),
  history(),
  bracketMatching(),
  highlightSelectionMatches(),
  search({ top: true }),
  imageInputExtension(),
  sourceTheme.initial,
  EditorView.lineWrapping,
  typewriter.initial(editor.typewriterMode),
  keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
    { key: "Mod-g", run: findNext },
    { key: "Shift-Mod-g", run: findPrevious },
    { key: "F3", run: findNext },
    { key: "Shift-F3", run: findPrevious },
    { key: "Mod-d", run: selectNextOccurrence },
  ]),
  EditorView.updateListener.of((update) => {
    if (!update.docChanged || applyingExternal) return;
    editor.setContent(update.state.doc.toString());
  }),
];

function createState(doc: string): EditorState {
  return EditorState.create({ doc, extensions });
}

function mountView(tabId: string, content: string) {
  if (!host.value) return;
  const cached = getTabEditorState(tabId);
  const state =
    cached && cached.doc.toString() === content
      ? cached
      : createState(content);
  view = new EditorView({ state, parent: host.value });
  editor.setCmView(view);
  setTabEditorState(tabId, view.state);
  sourceTheme.setDark(view, theme.isDark);
}

function switchTab(newId: string, oldId: string | undefined) {
  if (!view) return;
  if (oldId) setTabEditorState(oldId, view.state);

  const tab = tabs.tabs.find((t) => t.id === newId);
  const content = tab?.content ?? "";
  const cached = getTabEditorState(newId);
  const next =
    cached && cached.doc.toString() === content
      ? cached
      : createState(content);

  applyingExternal = true;
  view.setState(next);
  applyingExternal = false;
  setTabEditorState(newId, view.state);
  editor.setCmView(view);
  sourceTheme.setDark(view, theme.isDark);
}

onMounted(() => {
  mountView(tabs.activeId, editor.content);
  setFormatBridge(cmBridge);
});

watch(
  () => editor.typewriterMode,
  (enabled) => {
    if (view) typewriter.setEnabled(view, enabled);
  },
);

watch(
  () => theme.isDark,
  (dark) => {
    if (view) sourceTheme.setDark(view, dark);
  },
);

watch(
  () => tabs.activeId,
  (newId, oldId) => {
    switchTab(newId, oldId);
  },
);

/** 同 Tab 外部改内容（少见）时对齐文档 */
watch(
  () => editor.content,
  (value) => {
    if (!view || applyingExternal) return;
    if (view.state.doc.toString() === value) return;
    applyingExternal = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
    applyingExternal = false;
    setTabEditorState(tabs.activeId, view.state);
  },
);

onBeforeUnmount(() => {
  clearFormatBridge(cmBridge);
  if (view) {
    setTabEditorState(tabs.activeId, view.state);
    view.destroy();
    view = null;
  }
  editor.setCmView(null);
});
</script>

<template>
  <div ref="host" class="source-editor" />
</template>

<style scoped>
.source-editor {
  height: 100%;
  overflow: hidden;
  background: var(--bg-color);
}

.source-editor :deep(.cm-editor) {
  height: 100%;
}

.source-editor :deep(.cm-editor.cm-focused) {
  outline: none;
}

.source-editor :deep(.cm-panels) {
  display: none !important;
}
</style>
