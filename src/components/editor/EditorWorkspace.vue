<script setup lang="ts">
import { computed } from "vue";
import HybridEditor from "./HybridEditor.vue";
import SplitEditor from "./SplitEditor.vue";
import { useEditorStore } from "@/stores/editor";

const editor = useEditorStore();

const isHybrid = computed(() => editor.viewMode === "hybrid");
</script>

<template>
  <HybridEditor v-if="isHybrid" />
  <SplitEditor v-else />
</template>
