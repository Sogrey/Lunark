<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useEditorStore } from "@/stores/editor";
import { renderMarkdown } from "@/lib/markdown/renderer";
import { resolvePreviewImages } from "@/lib/markdown/images";
import { applyTocIdsToHtml, extractToc } from "@/lib/markdown/toc";
import { clearMermaidCache } from "@/lib/markdown/mermaid";

const editor = useEditorStore();
const html = ref("");
const pane = ref<HTMLElement | null>(null);

let timer: ReturnType<typeof setTimeout> | null = null;
let renderSeq = 0;

function scheduleRender(source: string, docPath: string | null) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void runRender(source, docPath);
  }, 160);
}

async function runRender(source: string, docPath: string | null) {
  const seq = ++renderSeq;
  const toc = extractToc(source);
  const { html: rendered } = await renderMarkdown(source);
  const withIds = applyTocIdsToHtml(rendered, toc);
  const withAssets = await resolvePreviewImages(withIds, docPath);
  if (seq !== renderSeq) return;
  html.value = withAssets;
}

watch(
  () => [editor.content, editor.filePath] as const,
  ([value, path]) => scheduleRender(value, path),
  { immediate: true },
);

onMounted(() => {
  clearMermaidCache();
  editor.setPreviewEl(pane.value);
});

watch(pane, (el) => {
  editor.setPreviewEl(el);
});

onBeforeUnmount(() => {
  editor.setPreviewEl(null);
});

const empty = computed(() => !editor.content.trim());
</script>

<template>
  <div ref="pane" class="preview-pane">
    <div v-if="empty" class="preview-empty">开始输入 Markdown…</div>
    <article
      v-else
      class="markdown-preview"
      v-html="html"
    />
  </div>
</template>

<style scoped>
.preview-pane {
  height: 100%;
  overflow: auto;
  background: var(--bg-color);
  border-left: 1px solid var(--border-color);
}

.preview-empty {
  padding: 2.5rem;
  color: var(--focus-dim-color);
  font-size: 0.95rem;
}

.preview-pane :deep(.markdown-preview img) {
  max-width: 100%;
  height: auto;
}

.preview-pane :deep(.markdown-preview h1),
.preview-pane :deep(.markdown-preview h2),
.preview-pane :deep(.markdown-preview h3),
.preview-pane :deep(.markdown-preview h4),
.preview-pane :deep(.markdown-preview h5),
.preview-pane :deep(.markdown-preview h6) {
  scroll-margin-top: 12px;
}
</style>
