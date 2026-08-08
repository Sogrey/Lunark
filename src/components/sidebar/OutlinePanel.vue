<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useEditorStore } from "@/stores/editor";
import { extractToc, type TocItem } from "@/lib/markdown/toc";

const { t } = useI18n();
const editor = useEditorStore();

const toc = computed(() => extractToc(editor.content));

function onJump(item: TocItem) {
  editor.jumpToHeading(item.line, item.id);
}
</script>

<template>
  <div class="outline">
    <div v-if="toc.length === 0" class="hint">{{ t("editor.outlineEmpty") }}</div>
    <button
      v-for="item in toc"
      :key="`${item.line}-${item.id}`"
      type="button"
      class="outline-item"
      :style="{ paddingLeft: `${8 + (item.level - 1) * 12}px` }"
      :title="t('editor.outlineLine', { line: item.line })"
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
