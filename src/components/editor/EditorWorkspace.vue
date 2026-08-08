<script setup lang="ts">
import { computed } from "vue";
import HybridEditor from "./HybridEditor.vue";
import SplitEditor from "./SplitEditor.vue";
import { useEditorStore } from "@/stores/editor";
import { useTabsStore } from "@/stores/tabs";
import { trackLocale } from "@/lib/i18n";

const editor = useEditorStore();
const tabs = useTabsStore();

const isHybrid = computed(() => editor.viewMode === "hybrid");
const hybridKey = computed(() => `${tabs.activeId}:${trackLocale()}`);
</script>

<template>
  <!-- key 含 locale：语言切换时重建 Crepe，拉取本地化 slash/placeholder -->
  <HybridEditor v-if="isHybrid" :key="hybridKey" />
  <SplitEditor v-else />
</template>
