<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { ElMessage } from "element-plus";
import SourceEditor from "./SourceEditor.vue";
import PreviewPane from "./PreviewPane.vue";
import { useEditorStore } from "@/stores/editor";
import { isImageFile, saveDroppedImages } from "@/lib/fs/imageDrop";
import { useScrollSync } from "@/composables/useScrollSync";

const editor = useEditorStore();
useScrollSync();
const root = ref<HTMLElement | null>(null);
const dragging = ref(false);
const dropActive = ref(false);

const sourceStyle = computed(() => {
  if (editor.viewMode === "source") {
    return { width: "100%" };
  }
  return { width: `${editor.splitRatio * 100}%` };
});

const previewVisible = computed(() => editor.viewMode === "split");

function onPointerDown(event: PointerEvent) {
  dragging.value = true;
  (event.target as HTMLElement).setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value || !root.value) return;
  const rect = root.value.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;
  editor.setSplitRatio(ratio);
}

function onPointerUp(event: PointerEvent) {
  dragging.value = false;
  try {
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
  } catch {
    /* already released */
  }
}

function onDragOver(event: DragEvent) {
  if (!event.dataTransfer?.types.includes("Files")) return;
  event.preventDefault();
  dropActive.value = true;
}

function onDragLeave() {
  dropActive.value = false;
}

async function onDrop(event: DragEvent) {
  event.preventDefault();
  dropActive.value = false;
  const files = event.dataTransfer?.files;
  if (!files?.length) return;

  const images = Array.from(files).filter(isImageFile);
  if (images.length === 0) return;

  if (!editor.filePath) {
    ElMessage.warning("请先保存文档，再拖入图片（将写入相对路径 ./assets/）");
    return;
  }

  try {
    const snippets = await saveDroppedImages(images, editor.filePath);
    if (snippets.length === 0) return;
    const insert = `\n\n${snippets.join("\n\n")}\n`;
    editor.setContent(`${editor.content}${insert}`);
    ElMessage.success(
      snippets.length === 1
        ? "已插入图片（./assets/）"
        : `已插入 ${snippets.length} 张图片`,
    );
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : "插入图片失败");
  }
}

onBeforeUnmount(() => {
  dragging.value = false;
});
</script>

<template>
  <div
    ref="root"
    class="split-editor"
    :class="{ 'drop-active': dropActive }"
    @pointermove="onPointerMove"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <section class="pane source" :style="sourceStyle">
      <SourceEditor />
    </section>

    <template v-if="previewVisible">
      <div
        class="splitter"
        role="separator"
        aria-orientation="vertical"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
      />
      <section class="pane preview">
        <PreviewPane />
      </section>
    </template>
  </div>
</template>

<style scoped>
.split-editor {
  display: flex;
  height: 100%;
  width: 100%;
  min-width: 0;
  user-select: none;
  position: relative;
}

.split-editor.drop-active::after {
  content: "松开以插入图片到 ./assets/";
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

.split-editor:not(:has(.splitter:active)) {
  user-select: auto;
}

.pane {
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.pane.source {
  flex: 0 0 auto;
}

.pane.preview {
  flex: 1 1 auto;
}

.splitter {
  flex: 0 0 5px;
  cursor: col-resize;
  background: var(--splitter-color);
  transition: background 0.15s ease;
}

.splitter:hover,
.splitter:active {
  background: var(--splitter-hover);
}
</style>
