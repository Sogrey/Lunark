<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { useTabsStore } from "@/stores/tabs";
import { useDocumentActions } from "@/composables/useDocumentActions";

const { t } = useI18n();
const tabs = useTabsStore();
const { closeTab, newFile } = useDocumentActions();

const scrollRef = ref<HTMLElement | null>(null);
const overflow = ref(false);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

const SCROLL_STEP = 160;

function onSelect(id: string) {
  tabs.activate(id);
}

function onClose(e: MouseEvent, id: string) {
  e.stopPropagation();
  void closeTab(id);
}

/** 双击标签栏空白 = 新建（对标常见编辑器） */
function onBarDblClick(e: MouseEvent) {
  const el = e.target as HTMLElement | null;
  if (!el) return;
  if (
    el.closest(".tab") ||
    el.closest(".tab-new") ||
    el.closest(".tab-nav")
  ) {
    return;
  }
  newFile();
}

function updateScrollState() {
  const el = scrollRef.value;
  if (!el) {
    overflow.value = false;
    canScrollLeft.value = false;
    canScrollRight.value = false;
    return;
  }
  const max = el.scrollWidth - el.clientWidth;
  overflow.value = max > 1;
  canScrollLeft.value = el.scrollLeft > 1;
  canScrollRight.value = el.scrollLeft < max - 1;
}

function scrollBy(delta: number) {
  const el = scrollRef.value;
  if (!el) return;
  el.scrollBy({ left: delta, behavior: "smooth" });
}

/** 纵向滚轮转为横向滚动 tab 列表 */
function onWheel(e: WheelEvent) {
  const el = scrollRef.value;
  if (!el || el.scrollWidth <= el.clientWidth) return;
  const delta =
    Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (delta === 0) return;
  e.preventDefault();
  el.scrollLeft += delta;
  updateScrollState();
}

function scrollActiveIntoView() {
  const root = scrollRef.value;
  if (!root) return;
  const active = root.querySelector<HTMLElement>(".tab.active");
  active?.scrollIntoView({
    inline: "nearest",
    block: "nearest",
    behavior: "smooth",
  });
  // scrollIntoView 异步生效后再刷新箭头状态
  requestAnimationFrame(() => updateScrollState());
}

let resizeObs: ResizeObserver | null = null;

onMounted(() => {
  const el = scrollRef.value;
  if (!el) return;
  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("scroll", updateScrollState, { passive: true });
  resizeObs = new ResizeObserver(() => updateScrollState());
  resizeObs.observe(el);
  updateScrollState();
});

onBeforeUnmount(() => {
  const el = scrollRef.value;
  el?.removeEventListener("wheel", onWheel);
  el?.removeEventListener("scroll", updateScrollState);
  resizeObs?.disconnect();
  resizeObs = null;
});

watch(
  () => tabs.activeId,
  async () => {
    await nextTick();
    scrollActiveIntoView();
  },
);

watch(
  () => tabs.tabs.map((tab) => `${tab.id}:${tab.name}`).join("\0"),
  async () => {
    await nextTick();
    updateScrollState();
    scrollActiveIntoView();
  },
);
</script>

<template>
  <div
    class="tab-bar"
    role="tablist"
    :aria-label="t('editor.openDocsAria')"
    @dblclick="onBarDblClick"
  >
    <button
      v-show="overflow"
      type="button"
      class="tab-nav tab-nav-left"
      :disabled="!canScrollLeft"
      :title="t('editor.scrollTabsLeft')"
      :aria-label="t('editor.scrollTabsLeft')"
      @click="scrollBy(-SCROLL_STEP)"
    >
      ‹
    </button>

    <div ref="scrollRef" class="tab-scroll">
      <div
        v-for="tab in tabs.tabs"
        :key="tab.id"
        class="tab"
        role="tab"
        tabindex="0"
        :aria-selected="tab.id === tabs.activeId"
        :class="{ active: tab.id === tabs.activeId, dirty: tab.dirty }"
        :title="tab.path ?? tab.name"
        @click="onSelect(tab.id)"
        @click.middle="closeTab(tab.id)"
        @keydown.enter.prevent="onSelect(tab.id)"
        @keydown.space.prevent="onSelect(tab.id)"
      >
        <span class="name">{{ tab.dirty ? `${tab.name} *` : tab.name }}</span>
        <button
          type="button"
          class="close"
          :aria-label="t('editor.closeTabNamed', { name: tab.name })"
          :title="t('editor.closeTab')"
          @click="onClose($event, tab.id)"
        >
          ×
        </button>
      </div>
    </div>

    <button
      v-show="overflow"
      type="button"
      class="tab-nav tab-nav-right"
      :disabled="!canScrollRight"
      :title="t('editor.scrollTabsRight')"
      :aria-label="t('editor.scrollTabsRight')"
      @click="scrollBy(SCROLL_STEP)"
    >
      ›
    </button>

    <button
      type="button"
      class="tab-new"
      :title="t('shell.newTab')"
      :aria-label="t('menu.new')"
      @click="newFile()"
    >
      +
    </button>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  align-items: stretch;
  height: 34px;
  flex-shrink: 0;
  background: var(--side-bar-bg-color);
  border-bottom: 1px solid var(--border-color);
  min-width: 0;
}

.tab-scroll {
  display: flex;
  align-items: stretch;
  gap: 1px;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tab-scroll::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.tab-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: var(--control-text-color);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.tab-nav-left {
  border-right: 1px solid var(--border-color);
}

.tab-nav-right {
  border-left: 1px solid var(--border-color);
}

.tab-nav:hover:not(:disabled) {
  color: var(--text-color);
  background: rgba(112, 113, 125, 0.25);
}

.tab-nav:disabled {
  opacity: 0.28;
  cursor: default;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 180px;
  padding: 0 4px 0 12px;
  border: 0;
  border-right: 1px solid var(--border-color);
  background: transparent;
  color: var(--control-text-color);
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
}

.tab:hover {
  background: rgba(112, 113, 125, 0.25);
  color: var(--text-color);
}

.tab.active {
  background: var(--bg-color);
  color: var(--active-file-text-color);
}

.tab.dirty .name {
  font-style: italic;
}

.tab .name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab .close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.55;
  flex-shrink: 0;
}

.tab .close:hover {
  opacity: 1;
  background: rgba(112, 113, 125, 0.35);
}

.tab-new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  flex-shrink: 0;
  border: 0;
  border-left: 1px solid var(--border-color);
  background: transparent;
  color: var(--control-text-color);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.tab-new:hover {
  color: var(--text-color);
  background: rgba(112, 113, 125, 0.25);
}
</style>
