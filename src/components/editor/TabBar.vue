<script setup lang="ts">
import {
  computed,
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
const {
  closeTab,
  closeTabsToTheRight,
  closeOtherTabs,
  closeAllTabs,
  newFile,
} = useDocumentActions();

const scrollRef = ref<HTMLElement | null>(null);
const overflow = ref(false);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

const menuOpen = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuTabId = ref<string | null>(null);

const SCROLL_STEP = 160;

const menuStyle = computed(() => ({
  left: `${menuX.value}px`,
  top: `${menuY.value}px`,
}));

const menuTabIndex = computed(() =>
  menuTabId.value
    ? tabs.tabs.findIndex((tab) => tab.id === menuTabId.value)
    : -1,
);

const canCloseRight = computed(
  () => menuTabIndex.value >= 0 && menuTabIndex.value < tabs.tabs.length - 1,
);

const canCloseOthers = computed(() => tabs.tabs.length > 1);

function onSelect(id: string) {
  tabs.activate(id);
}

function onClose(e: MouseEvent, id: string) {
  e.stopPropagation();
  void closeTab(id);
}

function closeMenu() {
  menuOpen.value = false;
  menuTabId.value = null;
}

function placeMenu(clientX: number, clientY: number) {
  const pad = 8;
  const mw = 200;
  const mh = 160;
  menuX.value = Math.min(clientX, window.innerWidth - mw - pad);
  menuY.value = Math.min(clientY, window.innerHeight - mh - pad);
  menuX.value = Math.max(pad, menuX.value);
  menuY.value = Math.max(pad, menuY.value);
}

function onTabContextMenu(e: MouseEvent, id: string) {
  e.preventDefault();
  e.stopPropagation();
  tabs.activate(id);
  menuTabId.value = id;
  placeMenu(e.clientX, e.clientY);
  menuOpen.value = true;
}

async function runMenu(action: (id: string) => Promise<void> | void) {
  const id = menuTabId.value;
  closeMenu();
  if (!id) return;
  await action(id);
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
  requestAnimationFrame(() => updateScrollState());
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") closeMenu();
}

function onPointerDown(e: MouseEvent) {
  if (!menuOpen.value) return;
  const el = e.target as HTMLElement | null;
  if (el?.closest(".tab-ctx-menu")) return;
  closeMenu();
}

let resizeObs: ResizeObserver | null = null;

onMounted(() => {
  const el = scrollRef.value;
  if (el) {
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", updateScrollState, { passive: true });
    resizeObs = new ResizeObserver(() => updateScrollState());
    resizeObs.observe(el);
    updateScrollState();
  }
  window.addEventListener("keydown", onKey);
  window.addEventListener("mousedown", onPointerDown, true);
  window.addEventListener("blur", closeMenu);
});

onBeforeUnmount(() => {
  const el = scrollRef.value;
  el?.removeEventListener("wheel", onWheel);
  el?.removeEventListener("scroll", updateScrollState);
  resizeObs?.disconnect();
  resizeObs = null;
  window.removeEventListener("keydown", onKey);
  window.removeEventListener("mousedown", onPointerDown, true);
  window.removeEventListener("blur", closeMenu);
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
        @contextmenu="onTabContextMenu($event, tab.id)"
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

  <Teleport to="body">
    <div
      v-if="menuOpen && menuTabId"
      class="tab-ctx-menu"
      :style="menuStyle"
      role="menu"
      @contextmenu.prevent
    >
      <button
        type="button"
        class="row"
        role="menuitem"
        @click="runMenu((id) => closeTab(id))"
      >
        {{ t("editor.closeTab") }}
      </button>
      <button
        type="button"
        class="row"
        role="menuitem"
        :disabled="!canCloseRight"
        @click="runMenu((id) => closeTabsToTheRight(id))"
      >
        {{ t("editor.closeTabsToRight") }}
      </button>
      <button
        type="button"
        class="row"
        role="menuitem"
        :disabled="!canCloseOthers"
        @click="runMenu((id) => closeOtherTabs(id))"
      >
        {{ t("editor.closeOtherTabs") }}
      </button>
      <div class="divider" />
      <button
        type="button"
        class="row"
        role="menuitem"
        @click="runMenu(() => closeAllTabs())"
      >
        {{ t("editor.closeAllTabs") }}
      </button>
    </div>
  </Teleport>
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

<style>
.tab-ctx-menu {
  position: fixed;
  z-index: 10050;
  min-width: 180px;
  padding: 6px;
  background: #2e3238;
  border: 1px solid var(--border-color, #474d54);
  border-radius: 8px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  color: var(--text-color, #b8bfc6);
  font-size: 13px;
}

.tab-ctx-menu .row {
  display: flex;
  align-items: center;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  padding: 7px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 13px;
}

.tab-ctx-menu .row:hover:not(:disabled) {
  background: rgba(112, 113, 125, 0.35);
}

.tab-ctx-menu .row:disabled {
  opacity: 0.35;
  cursor: default;
}

.tab-ctx-menu .divider {
  height: 1px;
  margin: 5px 4px;
  background: var(--border-color, #474d54);
}
</style>
