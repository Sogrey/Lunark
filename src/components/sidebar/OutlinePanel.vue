<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useEditorStore } from "@/stores/editor";
import { extractToc, type TocItem } from "@/lib/markdown/toc";

const { t } = useI18n();
const editor = useEditorStore();
const rootEl = ref<HTMLElement | null>(null);

const toc = computed(() => extractToc(editor.content));

function onJump(item: TocItem) {
  editor.jumpToHeading(item.line, item.id);
}

watch(
  () => editor.activeHeadingId,
  async (id) => {
    if (!id || !rootEl.value) return;
    await nextTick();
    const btn = rootEl.value.querySelector(
      `[data-heading-id="${CSS.escape(id)}"]`,
    ) as HTMLElement | null;
    btn?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  },
);
</script>

<template>
  <div ref="rootEl" class="outline">
    <div v-if="toc.length === 0" class="hint">{{ t("editor.outlineEmpty") }}</div>
    <button
      v-for="item in toc"
      :key="`${item.line}-${item.id}`"
      type="button"
      class="outline-item"
      :class="{ active: item.id === editor.activeHeadingId }"
      :data-heading-id="item.id"
      :aria-current="item.id === editor.activeHeadingId ? 'location' : undefined"
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
  border-left: 2px solid transparent;
}

.outline-item:hover {
  background: rgba(112, 113, 125, 0.35);
  color: var(--item-hover-text-color);
}

.outline-item.active {
  background: color-mix(
    in srgb,
    var(--primary-color, #6dc1e7) 18%,
    transparent
  );
  color: var(--primary-color-alt, var(--primary-color, #a3d5fe));
  border-left-color: var(--primary-color, #6dc1e7);
  font-weight: 600;
}
</style>
