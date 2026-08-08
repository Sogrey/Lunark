<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import SourceEditor from "./SourceEditor.vue";
import PreviewPane from "./PreviewPane.vue";
import { useEditorStore } from "@/stores/editor";
import {
  bindTauriFileDrop,
  onShellDragOver,
  onShellDrop,
} from "@/lib/editor/imageInput";
import { useScrollSync } from "@/composables/useScrollSync";

const { t } = useI18n();
const editor = useEditorStore();
useScrollSync();
const root = ref<HTMLElement | null>(null);
const dragging = ref(false);
const dropActive = ref(false);

let unbindDrop: (() => void) | null = null;

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

onMounted(() => {
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
  dragging.value = false;
  unbindDrop?.();
  unbindDrop = null;
});
</script>

<template>
  <div
    ref="root"
    class="split-editor"
    :class="{ 'drop-active': dropActive }"
    :data-hint="t('editor.dropImageHint')"
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
