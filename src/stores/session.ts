import { defineStore } from "pinia";
import { ref } from "vue";
import { fileBasename } from "@/lib/fs/documentIo";

export interface RecentFileEntry {
  path: string;
  name: string;
  openedAt: number;
}

export const MAX_RECENT_FILES = 12;
export const MAX_SESSION_TABS = 20;

export const useSessionStore = defineStore("session", () => {
  const recentFiles = ref<RecentFileEntry[]>([]);

  function setRecent(list: RecentFileEntry[]) {
    recentFiles.value = list.slice(0, MAX_RECENT_FILES);
  }

  /** 置顶最近打开；同路径去重 */
  function touchRecent(path: string, name?: string) {
    const entry: RecentFileEntry = {
      path,
      name: name ?? fileBasename(path),
      openedAt: Date.now(),
    };
    const next = [
      entry,
      ...recentFiles.value.filter((r) => r.path !== path),
    ].slice(0, MAX_RECENT_FILES);
    recentFiles.value = next;
  }

  function removeRecent(path: string) {
    recentFiles.value = recentFiles.value.filter((r) => r.path !== path);
  }

  function clearRecent() {
    recentFiles.value = [];
  }

  return {
    recentFiles,
    setRecent,
    touchRecent,
    removeRecent,
    clearRecent,
  };
});
