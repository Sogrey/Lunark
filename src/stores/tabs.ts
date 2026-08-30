import { defineStore } from "pinia";
import { computed, ref } from "vue";
import welcome from "@/assets/welcome.md?raw";
import { APP_VERSION } from "@/lib/help/credits";

export interface DocTab {
  id: string;
  path: string | null;
  name: string;
  content: string;
  dirty: boolean;
}

export const WELCOME_TAB_NAME = "Welcome.md";

function createId(): string {
  return crypto.randomUUID();
}

function createWelcomeTab(): DocTab {
  return {
    id: createId(),
    path: null,
    name: WELCOME_TAB_NAME,
    content: welcome,
    dirty: false,
  };
}

function createUntitledTab(): DocTab {
  return {
    id: createId(),
    path: null,
    name: "Untitled.md",
    content: "",
    dirty: false,
  };
}

export function isWelcomeTab(tab: DocTab | undefined | null): boolean {
  return !!tab && !tab.path && tab.name === WELCOME_TAB_NAME;
}

export const useTabsStore = defineStore("tabs", () => {
  const initial = createWelcomeTab();
  const tabs = ref<DocTab[]>([initial]);
  const activeId = ref(initial.id);
  /** 当前版本是否已关闭过 Welcome（与 prefs.welcomeSeenVersion 同步） */
  const welcomeSeenVersion = ref<string | null>(null);

  const activeTab = computed(() => {
    const found = tabs.value.find((t) => t.id === activeId.value);
    return found ?? tabs.value[0]!;
  });

  const activeIndex = computed(() =>
    tabs.value.findIndex((t) => t.id === activeId.value),
  );

  const shouldShowWelcome = computed(
    () => welcomeSeenVersion.value !== APP_VERSION,
  );

  function setActiveContent(value: string, markDirty = true) {
    const tab = activeTab.value;
    tab.content = value;
    if (markDirty) tab.dirty = true;
  }

  function markActiveSaved() {
    activeTab.value.dirty = false;
  }

  function activate(id: string) {
    if (tabs.value.some((t) => t.id === id)) {
      activeId.value = id;
    }
  }

  function markWelcomeDismissed() {
    welcomeSeenVersion.value = APP_VERSION;
  }

  /** 启动恢复后：按版本决定是否展示 / 移除 Welcome */
  function applyWelcomePolicy(seenVersion: string | null) {
    welcomeSeenVersion.value = seenVersion;

    if (seenVersion === APP_VERSION) {
      const kept = tabs.value.filter((t) => !isWelcomeTab(t) || t.dirty);
      tabs.value = kept;
      if (tabs.value.length === 0) {
        const untitled = createUntitledTab();
        tabs.value.push(untitled);
        activeId.value = untitled.id;
        return;
      }
      if (!tabs.value.some((t) => t.id === activeId.value)) {
        activeId.value = tabs.value[0]!.id;
      }
      return;
    }

    let welcomeTab = tabs.value.find((t) => isWelcomeTab(t));
    if (!welcomeTab) {
      welcomeTab = createWelcomeTab();
      tabs.value.unshift(welcomeTab);
    }
    activeId.value = welcomeTab.id;
  }

  function fillEmpty() {
    if (tabs.value.length > 0) return;
    const tab = shouldShowWelcome.value
      ? createWelcomeTab()
      : createUntitledTab();
    tabs.value.push(tab);
    activeId.value = tab.id;
  }

  /** 若已有同 path 的 Tab 则激活；否则新建并激活。返回 tab id */
  function openOrFocus(path: string | null, name: string, content: string): string {
    if (path) {
      const existing = tabs.value.find((t) => t.path === path);
      if (existing) {
        activeId.value = existing.id;
        return existing.id;
      }
    }

    // 打开真实文件时，替换未修改的 Welcome 页，避免堆 Tab
    if (path) {
      const welcomeOnly =
        tabs.value.length === 1 &&
        isWelcomeTab(tabs.value[0]) &&
        !tabs.value[0]!.dirty;
      if (welcomeOnly) {
        const tab = tabs.value[0]!;
        tab.path = path;
        tab.name = name;
        tab.content = content;
        tab.dirty = false;
        activeId.value = tab.id;
        return tab.id;
      }
    }

    const tab: DocTab = {
      id: createId(),
      path,
      name,
      content,
      dirty: false,
    };
    tabs.value.push(tab);
    activeId.value = tab.id;
    return tab.id;
  }

  function updateActiveMeta(path: string | null, name: string) {
    const tab = activeTab.value;
    tab.path = path;
    tab.name = name;
  }

  function closeTab(id: string): boolean {
    const index = tabs.value.findIndex((t) => t.id === id);
    if (index < 0) return false;

    const closing = tabs.value[index]!;
    if (isWelcomeTab(closing)) {
      markWelcomeDismissed();
    }

    const wasActive = activeId.value === id;
    tabs.value.splice(index, 1);

    if (tabs.value.length === 0) {
      fillEmpty();
      return true;
    }

    if (wasActive) {
      const next = tabs.value[Math.min(index, tabs.value.length - 1)]!;
      activeId.value = next.id;
    }
    return true;
  }

  function newUntitled() {
    const tab = createUntitledTab();
    tabs.value.push(tab);
    activeId.value = tab.id;
  }

  function activateNext() {
    if (tabs.value.length < 2) return;
    const i = activeIndex.value;
    const next = tabs.value[(i + 1) % tabs.value.length]!;
    activeId.value = next.id;
  }

  function activatePrev() {
    if (tabs.value.length < 2) return;
    const i = activeIndex.value;
    const prev = tabs.value[(i - 1 + tabs.value.length) % tabs.value.length]!;
    activeId.value = prev.id;
  }

  return {
    tabs,
    activeId,
    activeTab,
    activeIndex,
    welcomeSeenVersion,
    shouldShowWelcome,
    setActiveContent,
    markActiveSaved,
    activate,
    activateNext,
    activatePrev,
    openOrFocus,
    updateActiveMeta,
    closeTab,
    newUntitled,
    applyWelcomePolicy,
    markWelcomeDismissed,
  };
});
