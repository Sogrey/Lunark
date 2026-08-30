<script setup lang="ts">
/**
 * 每个 Tab 一个 HybridEditor 实例（父级 :key="activeId"）。
 * 切 Tab = 卸载旧实例（flush 回该 Tab）+ 挂载新实例，避免单例 Crepe 串内容。
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Crepe } from "@milkdown/crepe";
import { editorViewCtx } from "@milkdown/kit/core";
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
import { lunarkHybridSourceMarks } from "@/lib/editor/hybrid/sourceMarksPlugin";
import { lunarkHybridMarkdownInput } from "@/lib/editor/hybridMarkdownInput";

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/common/reset.css";
import "@milkdown/crepe/theme/frame-dark.css";

const { t } = useI18n();
const editor = useEditorStore();
const tabs = useTabsStore();

/** 本实例终身只服务这一个 Tab（setup 时冻结） */
const ownedTabId = tabs.activeId;
const initialMarkdown =
  tabs.tabs.find((t) => t.id === ownedTabId)?.content ?? "";

const root = ref<HTMLElement | null>(null);
const dropActive = ref(false);

let crepe: Crepe | null = null;
let applyingExternal = false;
let ready = false;
let alive = true;
let unbindDrop: (() => void) | null = null;
let typewriterTimer: ReturnType<typeof setTimeout> | null = null;
let releaseApplyTimer: ReturnType<typeof setTimeout> | null = null;
const hybridBridge = createHybridFormatBridge(() => crepe);

function beginExternalApply() {
  applyingExternal = true;
  if (releaseApplyTimer) {
    clearTimeout(releaseApplyTimer);
    releaseApplyTimer = null;
  }
}

function endExternalApplySoon(ms = 280) {
  if (releaseApplyTimer) clearTimeout(releaseApplyTimer);
  releaseApplyTimer = setTimeout(() => {
    releaseApplyTimer = null;
    applyingExternal = false;
  }, ms);
}

function normalizeDocText(md: string): string {
  return md.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

function isEffectivelyEmpty(md: string): boolean {
  return normalizeDocText(md).trim().length === 0;
}

function docsMatch(got: string, want: string): boolean {
  if (got === want) return true;
  if (isEffectivelyEmpty(got) && isEffectivelyEmpty(want)) return true;
  return normalizeDocText(got) === normalizeDocText(want);
}

function writeToOwnedTab(markdown: string) {
  const tab = tabs.tabs.find((t) => t.id === ownedTabId);
  if (!tab) return;
  if (tab.content === "" && isEffectivelyEmpty(markdown)) return;
  if (tab.content === markdown) return;
  tab.content = markdown;
  tab.dirty = true;
}

function flushOwnedTab() {
  if (!crepe || !ready) return;
  try {
    const md = crepe.getMarkdown();
    const tab = tabs.tabs.find((t) => t.id === ownedTabId);
    if (!tab) return;
    if (tab.content === "" && isEffectivelyEmpty(md)) return;
    if (tab.content !== md) tab.content = md;
  } catch {
    /* ignore */
  }
}

function loadMarkdown(md: string) {
  if (!crepe) return;
  const payload = md.length === 0 ? "\n" : md;
  crepe.editor.action(replaceAll(payload, true));
}

async function mountCrepe() {
  if (!root.value || crepe || !alive) return;

  const config = buildCrepeConfig(
    initialMarkdown.length === 0 ? "\n" : initialMarkdown,
  );
  config.root = root.value;

  const instance = new Crepe(config);
  for (const plugin of lunarkHybridMarkdownInput()) {
    instance.editor.use(plugin);
  }
  instance.editor.use(lunarkHybridSourceMarks());

  instance.on((listener) => {
    listener.markdownUpdated((_ctx, markdown, prev) => {
      if (!alive || !ready || applyingExternal) return;
      if (markdown === prev) return;
      // 绝不能写到别的 Tab
      if (tabs.activeId !== ownedTabId) return;
      writeToOwnedTab(markdown);
    });
  });

  await instance.create();
  if (!alive) {
    try {
      await instance.destroy();
    } catch {
      /* ignore */
    }
    return;
  }
  crepe = instance;
  ready = true;
  setFormatBridge(hybridBridge);

  // 新建空白标签：正文自动聚焦，方便直接输入
  if (isEffectivelyEmpty(initialMarkdown)) {
    await nextTick();
    requestAnimationFrame(() => focusOwnedEditor());
  }
}

function focusOwnedEditor() {
  if (!alive || !crepe || !ready) return;
  try {
    crepe.editor.action((ctx) => {
      ctx.get(editorViewCtx).focus();
    });
  } catch {
    root.value?.querySelector<HTMLElement>(".ProseMirror")?.focus();
  }
}

async function destroyCrepe() {
  ready = false;
  clearFormatBridge(hybridBridge);
  if (!crepe) return;
  const inst = crepe;
  crepe = null;
  try {
    await inst.destroy();
  } catch {
    /* ignore */
  }
  if (root.value) root.value.innerHTML = "";
}

function applyMarkdown(md: string) {
  if (!crepe || !ready || !alive) return;
  if (docsMatch(crepe.getMarkdown(), md)) return;
  beginExternalApply();
  try {
    loadMarkdown(md);
  } finally {
    endExternalApplySoon();
  }
}

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
  unbindDrop = bindTauriFileDrop({
    onOver: () => {
      dropActive.value = true;
    },
    onLeave: () => {
      dropActive.value = false;
    },
  });
});

onBeforeUnmount(() => {
  alive = false;
  // 先落盘本 Tab，再销毁（补上 markdownUpdated 防抖未到的最后一笔）
  flushOwnedTab();
  if (typewriterTimer) clearTimeout(typewriterTimer);
  if (releaseApplyTimer) clearTimeout(releaseApplyTimer);
  document.removeEventListener("selectionchange", scheduleTypewriter);
  unbindDrop?.();
  unbindDrop = null;
  void destroyCrepe();
});

/** 仅本 Tab 被外部重载时同步（文件监视等）；切 Tab 靠父级 key 重建 */
watch(
  () => editor.content,
  (value) => {
    if (!alive || !ready || applyingExternal) return;
    if (tabs.activeId !== ownedTabId) return;
    if (!crepe) return;
    if (docsMatch(crepe.getMarkdown(), value)) return;
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
  () => {
    if (tabs.activeId === ownedTabId) scheduleTypewriter();
  },
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
    :data-hint="t('editor.dropImageHint')"
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
  content: attr(data-hint);
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

.hybrid-editor :deep(.ProseMirror p) {
  font-size: 1em;
  margin: 0;
  padding: 0.25em 0;
}

.hybrid-editor :deep(.milkdown-code-block) {
  margin: 0.75rem 0;
}
</style>
