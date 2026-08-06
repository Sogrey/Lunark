<script setup lang="ts">
import { Codemirror } from "vue-codemirror";
import type { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView as CMView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { bracketMatching } from "@codemirror/language";
import { nightEditorTheme, nightSyntax } from "@/lib/editor/nightTheme";
import { useEditorStore } from "@/stores/editor";
import { useTabsStore } from "@/stores/tabs";
import { onBeforeUnmount } from "vue";

const editor = useEditorStore();
const tabs = useTabsStore();

const extensions = [
  markdown(),
  lineNumbers(),
  highlightActiveLine(),
  history(),
  bracketMatching(),
  highlightSelectionMatches(),
  nightEditorTheme,
  nightSyntax,
  CMView.lineWrapping,
  keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
];

function onChange(value: string) {
  editor.setContent(value);
}

function onReady(payload: { view: EditorView }) {
  editor.setCmView(payload.view);
}

onBeforeUnmount(() => {
  editor.setCmView(null);
});
</script>

<template>
  <div class="source-editor">
    <Codemirror
      :key="tabs.activeId"
      :model-value="editor.content"
      :extensions="extensions"
      :autofocus="true"
      :indent-with-tab="true"
      :tab-size="2"
      style="height: 100%"
      @ready="onReady"
      @change="onChange"
    />
  </div>
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
</style>
