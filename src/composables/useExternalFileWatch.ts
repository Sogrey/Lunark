import { onBeforeUnmount, onMounted, watch } from "vue";
import { isTauri } from "@tauri-apps/api/core";
import { ask } from "@tauri-apps/plugin-dialog";
import { stat } from "@tauri-apps/plugin-fs";
import { ElMessage } from "element-plus";
import { useTabsStore, type DocTab } from "@/stores/tabs";
import { readMarkdownFile } from "@/lib/fs/documentIo";
import { discardTabEditorState } from "@/lib/editor/tabEditorStates";
import { t } from "@/lib/i18n";

/** path → 上次已知磁盘 mtime(ms) */
const baselines = new Map<string, number>();
const prompting = new Set<string>();

function pathKey(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
}

export async function rememberDiskMtime(path: string): Promise<void> {
  if (!isTauri()) return;
  try {
    const info = await stat(path);
    if (info.mtime) baselines.set(pathKey(path), info.mtime.getTime());
  } catch {
    /* ignore */
  }
}

export function clearDiskMtime(path: string): void {
  baselines.delete(pathKey(path));
}

/**
 * 轮询已打开文件的 mtime；外部变更时提示重新加载。
 */
export function useExternalFileWatch(intervalMs = 2000) {
  const tabs = useTabsStore();
  let timer: ReturnType<typeof setInterval> | null = null;

  async function reloadFromDisk(tab: DocTab) {
    if (!tab.path) return;
    try {
      const text = await readMarkdownFile(tab.path);
      discardTabEditorState(tab.id);
      tab.content = text;
      tab.dirty = false;
      await rememberDiskMtime(tab.path);
      ElMessage.success(t("msg.reloaded", { name: tab.name }));
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : t("msg.reloadFail"));
    }
  }

  async function handleChanged(tab: DocTab) {
    if (!tab.path) return;
    const key = pathKey(tab.path);
    if (prompting.has(key)) return;
    prompting.add(key);
    try {
      const body = tab.dirty
        ? t("msg.externalChangedDirty", { name: tab.name })
        : t("msg.externalChanged", { name: tab.name });
      let ok = false;
      try {
        ok = await ask(body, { title: "Lunark", kind: "warning" });
      } catch {
        ok = window.confirm(body);
      }
      if (ok) {
        await reloadFromDisk(tab);
      } else {
        // 接受当前磁盘为新基线，避免反复弹窗
        await rememberDiskMtime(tab.path);
      }
    } finally {
      prompting.delete(key);
    }
  }

  async function tick() {
    if (!isTauri()) return;
    for (const tab of tabs.tabs) {
      if (!tab.path) continue;
      const key = pathKey(tab.path);
      try {
        const info = await stat(tab.path);
        const mtime = info.mtime?.getTime();
        if (mtime == null) continue;
        const prev = baselines.get(key);
        if (prev == null) {
          baselines.set(key, mtime);
          continue;
        }
        if (mtime > prev + 500) {
          baselines.set(key, mtime);
          await handleChanged(tab);
        }
      } catch {
        /* 文件可能已删，忽略 */
      }
    }
  }

  function start() {
    if (!isTauri() || timer) return;
    timer = setInterval(() => {
      void tick();
    }, intervalMs);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  onMounted(() => {
    start();
    // 为已打开路径补基线
    for (const tab of tabs.tabs) {
      if (tab.path) void rememberDiskMtime(tab.path);
    }
  });

  watch(
    () => tabs.tabs.map((t) => t.path).join("|"),
    () => {
      for (const tab of tabs.tabs) {
        if (tab.path && !baselines.has(pathKey(tab.path))) {
          void rememberDiskMtime(tab.path);
        }
      }
    },
  );

  onBeforeUnmount(stop);

  return { start, stop, rememberDiskMtime };
}
