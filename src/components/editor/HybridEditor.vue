<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Crepe } from "@milkdown/crepe";
import { replaceAll } from "@milkdown/kit/utils";
import { useEditorStore } from "@/stores/editor";
import { useTabsStore } from "@/stores/tabs";
import { buildCrepeConfig } from "@/lib/editor/crepeConfig";
import {
  bindTauriFileDrop,
  onShellDragOver,
  onShellDrop,
} from "@/lib/editor/imageInput";
import { createHybridFormatBridge } from "@/lib/editor/hybridFormat";
import { clearFormatBridge, setFormatBridge } from "@/lib/editor/formatBridge";

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/common/reset.css";
import "@milkdown/crepe/theme/frame-dark.css";

const editor = useEditorStore();
const tabs = useTabsStore();
const root = ref<HTMLElement | null>(null);
const dropActive = ref(false);

let crepe: Crepe | null = null;
let applyingExternal = false;
let ready = false;
let unbindDrop: (() => void) | null = null;
let typewriterTimer: ReturnType<typeof setTimeout> | null = null;
const hybridBridge = createHybridFormatBridge(() => crepe);

async function mountCrepe() {
  if (!root.value || crepe) return;

  const config = buildCrepeConfig(editor.content || "");
  config.root = root.value;

  const instance = new Crepe(config);

  instance.on((listener) => {
    listener.markdownUpdated((_ctx, markdown, prev) => {
      if (!ready || applyingExternal) return;
      if (markdown === prev) return;
      editor.setContent(markdown);
    });
  });

  await instance.create();
  crepe = instance;
  ready = true;
  setFormatBridge(hybridBridge);
}

async function destroyCrepe() {
  ready = false;
  clearFormatBridge(hybridBridge);
  if (!crepe) return;
  try {
    await crepe.destroy();
  } catch {
    /* ignore */
  }
  crepe = null;
  if (root.value) root.value.innerHTML = "";
}

function applyMarkdown(md: string) {
  if (!crepe || !ready) return;
  const current = crepe.getMarkdown();
  if (current === md) return;
  applyingExternal = true;
  try {
    crepe.editor.action(replaceAll(md));
  } finally {
    queueMicrotask(() => {
      applyingExternal = false;
    });
  }
}

/** 打字机：把光标/选区滚到视口中部 */
function keepCaretCentered() {
  if (!editor.typewriterMode || !root.value) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!root.value.contains(range.commonAncestorContainer)) return;
  const rect = range.getBoundingClientRect();
  if (rect.height === 0 && rect.width === 0) return;
  const scroller = root.value.closest(".hybrid-editor") as HTMLElement | null;
  if (!scroller) return;
  const box = scroller.getBoundingClientRect();
  const target =
    scroller.scrollTop +
    (rect.top - box.top) -
    box.height / 2 +
    rect.height / 2;
  scroller.scrollTo({ top: Math.max(0, target), behavior: "auto" });
}

function scheduleTypewriter() {
  if (!editor.typewriterMode) return;
  if (typewriterTimer) clearTimeout(typewriterTimer);
  typewriterTimer = setTimeout(() => {
    typewriterTimer = null;
    keepCaretCentered();
  }, 16);
}

onMounted(() => {
  void mountCrepe();
  document.addEventListener("selectionchange", scheduleTypewriter);
  void bindTauriFileDrop({
    onOver: () => {
      dropActive.value = true;
    },
    onLeave: () => {
      dropActive.value = false;
    },
  }).then((unlisten) => {
    unbindDrop = unlisten;
  });
});

onBeforeUnmount(() => {
  if (typewriterTimer) clearTimeout(typewriterTimer);
  document.removeEventListener("selectionchange", scheduleTypewriter);
  unbindDrop?.();
  unbindDrop = null;
  void destroyCrepe();
});

watch(
  () => tabs.activeId,
  async () => {
    await nextTick();
    applyMarkdown(editor.content);
  },
);

/** 外部重载等同 Tab 内容变更（非本编辑器输入） */
watch(
  () => editor.content,
  (value) => {
    if (!ready || applyingExternal) return;
    if (!crepe) return;
    if (crepe.getMarkdown() === value) return;
    applyMarkdown(value);
  },
);

watch(
  () => editor.typewriterMode,
  (on) => {
    if (on) scheduleTypewriter();
  },
);

watch(
  () => editor.content,
  () => scheduleTypewriter(),
);

function onDragOver(event: DragEvent) {
  if (onShellDragOver(event)) dropActive.value = true;
}

function onDragLeave(event: DragEvent) {
  const next = event.relatedTarget as Node | null;
  if (next && root.value?.contains(next)) return;
  dropActive.value = false;
}

function onDrop(event: DragEvent) {
  dropActive.value = false;
  onShellDrop(event);
}
</script>

<template>
  <div
    class="hybrid-editor"
    :class="{ 'drop-active': dropActive }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div ref="root" class="crepe-root milkdown" />
  </div>
</template>

<style scoped>
.hybrid-editor {
  height: 100%;
  width: 100%;
  min-width: 0;
  overflow: auto;
  background: var(--bg-color);
  position: relative;
}

.hybrid-editor.drop-active::after {
  content: "松开以在光标处插入图片（./assets/）";
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(54, 59, 64, 0.82);
  color: var(--primary-color);
  font-size: 14px;
  z-index: 5;
  pointer-events: none;
}

.crepe-root {
  min-height: 100%;
  padding: 1.25rem 1.5rem 3rem;
  box-sizing: border-box;
}

/* Night：压过 Crepe frame-dark 默认，贴近一期变量 */
.hybrid-editor :deep(.milkdown) {
  --crepe-color-background: var(--bg-color);
  --crepe-color-on-background: var(--text-color);
  --crepe-color-surface: var(--side-bar-bg-color);
  --crepe-color-on-surface: var(--text-color);
  --crepe-color-on-surface-variant: var(--control-text-color);
  --crepe-color-primary: var(--primary-color);
  --crepe-color-secondary: var(--item-hover-bg-color);
  --crepe-color-outline: var(--border-color);
  --crepe-color-hover: var(--item-hover-bg-color);
  background: var(--bg-color);
  color: var(--text-color);
}

.hybrid-editor :deep(.ProseMirror) {
  min-height: 60vh;
  outline: none;
  font-size: 16px;
  line-height: 1.7;
}

/* 标题层级：显式覆盖，避免 Crepe 主题未生效时 h1–h6 同字号 */
.hybrid-editor :deep(.ProseMirror h1),
.hybrid-editor :deep(.ProseMirror h2),
.hybrid-editor :deep(.ProseMirror h3),
.hybrid-editor :deep(.ProseMirror h4),
.hybrid-editor :deep(.ProseMirror h5),
.hybrid-editor :deep(.ProseMirror h6) {
  font-family: var(--font-heading);
  font-weight: 600;
  color: var(--heading-color);
  margin: 0 0 0.75em;
  padding: 0.15em 0;
  line-height: 1.3;
  word-wrap: break-word;
}

.hybrid-editor :deep(.ProseMirror h1) {
  font-size: 2.25em;
  letter-spacing: -0.02em;
  margin-top: 1.2em;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.35em;
}

.hybrid-editor :deep(.ProseMirror h2) {
  font-size: 1.65em;
  margin-top: 1.1em;
}

.hybrid-editor :deep(.ProseMirror h3) {
  font-size: 1.35em;
  margin-top: 1em;
}

.hybrid-editor :deep(.ProseMirror h4) {
  font-size: 1.15em;
  margin-top: 0.9em;
  color: var(--heading-strong-color);
}

.hybrid-editor :deep(.ProseMirror h5) {
  font-size: 1.05em;
  margin-top: 0.85em;
}

.hybrid-editor :deep(.ProseMirror h6) {
  font-size: 0.95em;
  margin-top: 0.8em;
  color: var(--heading-strong-color);
  font-weight: 700;
}

.hybrid-editor :deep(.ProseMirror p) {
  font-size: 1em;
  margin: 0;
  padding: 0.25em 0;
}

.hybrid-editor :deep(.ProseMirror > :first-child) {
  margin-top: 0;
}

.hybrid-editor :deep(.lunark-mermaid-preview) {
  margin: 0.5rem 0;
  padding: 0.75rem;
  background: var(--side-bar-bg-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow-x: auto;
}

.hybrid-editor :deep(.lunark-mermaid-preview svg) {
  max-width: 100%;
  height: auto;
}

.hybrid-editor :deep(.milkdown-code-block) {
  margin: 0.75rem 0;
}
</style>
