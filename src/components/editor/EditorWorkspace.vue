<script setup lang="ts">
/**
 * 混合模式：按 Tab 缓存 HybridEditor（隐藏不销毁），切 Tab 不再整表重建 Crepe。
 * locale 变更时 key 变化，统一重建以刷新 slash / placeholder。
 */
import { computed, ref, watch } from "vue";
import HybridEditor from "./HybridEditor.vue";
import SplitEditor from "./SplitEditor.vue";
import { useEditorStore } from "@/stores/editor";
import { useTabsStore } from "@/stores/tabs";
import { trackLocale } from "@/lib/i18n";

/** 同时保留的 Crepe 实例上限，超出按 LRU 卸掉 */
const MAX_HYBRID_CACHE = 6;

const editor = useEditorStore();
const tabs = useTabsStore();

const isHybrid = computed(() => editor.viewMode === "hybrid");
const locale = computed(() => trackLocale());

/** 已挂载过的 hybrid Tab（访问顺序：末尾最新） */
const hybridCacheOrder = ref<string[]>([]);

function touchHybridCache(id: string) {
  const next = hybridCacheOrder.value.filter((x) => x !== id);
  next.push(id);
  while (next.length > MAX_HYBRID_CACHE) next.shift();
  hybridCacheOrder.value = next;
}

watch(
  () => [isHybrid.value, tabs.activeId] as const,
  ([hybrid, id]) => {
    if (hybrid && id) touchHybridCache(id);
  },
  { immediate: true },
);

watch(
  () => tabs.tabs.map((t) => t.id).join("\0"),
  () => {
    const live = new Set(tabs.tabs.map((t) => t.id));
    hybridCacheOrder.value = hybridCacheOrder.value.filter((id) =>
      live.has(id),
    );
  },
);

const cachedHybridIds = computed(() => {
  const live = new Set(tabs.tabs.map((t) => t.id));
  return hybridCacheOrder.value.filter((id) => live.has(id));
});
</script>

<template>
  <template v-if="isHybrid">
    <HybridEditor
      v-for="id in cachedHybridIds"
      :key="`${id}:${locale}`"
      v-show="id === tabs.activeId"
      :tab-id="id"
      :active="id === tabs.activeId"
    />
  </template>
  <SplitEditor v-else />
</template>
