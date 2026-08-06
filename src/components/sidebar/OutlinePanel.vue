<script setup lang="ts">
import { computed } from "vue";
import { useEditorStore } from "@/stores/editor";
import { extractToc, type TocItem } from "@/lib/markdown/toc";

const editor = useEditorStore();

const toc = computed(() => extractToc(editor.content));

function onJump(item: TocItem) {
  editor.jumpToHeading(item.line, item.id);
}
</script>

<template>
  <div class="outline">
    <div v-if="toc.length === 0" class="hint">当前文档没有标题。</div>
    <button
      v-for="item in toc"
      :key="`${item.line}-${item.id}`"
      type="button"
      class="outline-item"
      :style="{ paddingLeft: `${8 + (item.level - 1) * 12}px` }"
      :title="`第 ${item.line} 行`"
      @click="onJump(item)"
    >
      {{ item.text }}
    </button>
  </div>
</template>

<style scoped>
.outline {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-height: 0;
}

.hint {
  margin: 0 6px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--focus-dim-color);
}

.outline-item {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--toc-color);
  text-align: left;
  padding: 5px 8px;
  font-size: 13px;
  line-height: 1.35;
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-item:hover {
  background: rgba(112, 113, 125, 0.35);
  color: var(--item-hover-text-color);
}
</style>
