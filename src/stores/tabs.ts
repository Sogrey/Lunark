import { defineStore } from "pinia";
import { computed, ref } from "vue";
import welcome from "@/assets/welcome.md?raw";

export interface DocTab {
  id: string;
  path: string | null;
  name: string;
  content: string;
  dirty: boolean;
}

function createId(): string {
  return crypto.randomUUID();
}

function createWelcomeTab(): DocTab {
  return {
    id: createId(),
    path: null,
    name: "Welcome.md",
    content: welcome,
    dirty: false,
  };
}

export const useTabsStore = defineStore("tabs", () => {
  const initial = createWelcomeTab();
  const tabs = ref<DocTab[]>([initial]);
  const activeId = ref(initial.id);

  const activeTab = computed(() => {
    const found = tabs.value.find((t) => t.id === activeId.value);
    return found ?? tabs.value[0]!;
  });

  const activeIndex = computed(() =>
    tabs.value.findIndex((t) => t.id === activeId.value),
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

  /** 若已有同 path 的 Tab 则激活；否则新建并激活。返回 tab id */
  function openOrFocus(path: string | null, name: string, content: string): string {
    if (path) {
      const existing = tabs.value.find((t) => t.path === path);
      if (existing) {
        activeId.value = existing.id;
        return existing.id;
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

    const wasActive = activeId.value === id;
    tabs.value.splice(index, 1);

    if (tabs.value.length === 0) {
      const welcomeTab = createWelcomeTab();
      tabs.value.push(welcomeTab);
      activeId.value = welcomeTab.id;
      return true;
    }

    if (wasActive) {
      const next = tabs.value[Math.min(index, tabs.value.length - 1)]!;
      activeId.value = next.id;
    }
    return true;
  }

  function newUntitled() {
    const tab: DocTab = {
      id: createId(),
      path: null,
      name: "Untitled.md",
      content: "",
      dirty: false,
    };
    tabs.value.push(tab);
    activeId.value = tab.id;
  }

  return {
    tabs,
    activeId,
    activeTab,
    activeIndex,
    setActiveContent,
    markActiveSaved,
    activate,
    openOrFocus,
    updateActiveMeta,
    closeTab,
    newUntitled,
  };
});
