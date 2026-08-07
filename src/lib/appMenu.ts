import { isTauri } from "@tauri-apps/api/core";
import {
  CheckMenuItem,
  Menu,
  MenuItem,
  PredefinedMenuItem,
  Submenu,
} from "@tauri-apps/api/menu";
import { useSessionStore } from "@/stores/session";
import { useThemeStore } from "@/stores/theme";
import { BUILTIN_THEMES, type ThemeId } from "@/lib/theme/catalog";

/**
 * 原生菜单。快捷键由菜单 accelerator 触发（前端不再重复绑定同名 Ctrl 组合键）。
 */
export async function setupAppMenu(): Promise<void> {
  await refreshAppMenu();
}

export async function refreshAppMenu(): Promise<void> {
  if (!isTauri()) return;

  const emit = (name: string, detail?: unknown) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  };

  try {
    const session = useSessionStore();
    const theme = useThemeStore();
    const recentItems: Array<
      MenuItem | PredefinedMenuItem | Submenu | CheckMenuItem
    > =
      session.recentFiles.length === 0
        ? [
            await MenuItem.new({
              id: "recent-empty",
              text: "（无）",
              enabled: false,
              action: () => undefined,
            }),
          ]
        : await Promise.all(
            session.recentFiles.map((r, i) =>
              MenuItem.new({
                id: `recent-${i}`,
                text: r.name,
                action: () => emit("lunark:menu-open-recent", r.path),
              }),
            ),
          );

    if (session.recentFiles.length > 0) {
      recentItems.push(await PredefinedMenuItem.new({ item: "Separator" }));
      recentItems.push(
        await MenuItem.new({
          id: "recent-clear",
          text: "清除最近打开",
          action: () => emit("lunark:menu-clear-recent"),
        }),
      );
    }

    const recentSub = await Submenu.new({
      text: "最近打开",
      items: recentItems,
    });

    const file = await Submenu.new({
      text: "文件",
      items: [
        await MenuItem.new({
          id: "open",
          text: "打开…",
          accelerator: "CmdOrCtrl+O",
          action: () => emit("lunark:menu-open"),
        }),
        await MenuItem.new({
          id: "open-folder",
          text: "打开文件夹…",
          accelerator: "CmdOrCtrl+Shift+O",
          action: () => emit("lunark:menu-open-folder"),
        }),
        recentSub,
        await MenuItem.new({
          id: "new",
          text: "新建",
          accelerator: "CmdOrCtrl+N",
          action: () => emit("lunark:menu-new"),
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: "save",
          text: "保存",
          accelerator: "CmdOrCtrl+S",
          action: () => emit("lunark:menu-save"),
        }),
        await MenuItem.new({
          id: "save-as",
          text: "另存为…",
          accelerator: "CmdOrCtrl+Shift+S",
          action: () => emit("lunark:menu-save-as"),
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: "export-html",
          text: "导出 HTML…",
          action: () => emit("lunark:menu-export-html"),
        }),
        await MenuItem.new({
          id: "export-pdf",
          text: "导出 PDF…",
          action: () => emit("lunark:menu-export-pdf"),
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: "close-tab",
          text: "关闭标签",
          accelerator: "CmdOrCtrl+W",
          action: () => emit("lunark:menu-close-tab"),
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: "quit",
          text: "退出",
          accelerator: "CmdOrCtrl+Q",
          action: () => emit("lunark:menu-quit"),
        }),
      ],
    });

    const edit = await Submenu.new({
      text: "编辑",
      items: [
        await PredefinedMenuItem.new({ item: "Undo" }),
        await PredefinedMenuItem.new({ item: "Redo" }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await PredefinedMenuItem.new({ item: "Cut" }),
        await PredefinedMenuItem.new({ item: "Copy" }),
        await PredefinedMenuItem.new({ item: "Paste" }),
        await PredefinedMenuItem.new({ item: "SelectAll" }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: "find",
          text: "查找…",
          accelerator: "CmdOrCtrl+F",
          action: () => emit("lunark:menu-find"),
        }),
        await MenuItem.new({
          id: "replace",
          text: "替换…",
          accelerator: "CmdOrCtrl+H",
          action: () => emit("lunark:menu-replace"),
        }),
        await MenuItem.new({
          id: "find-in-workspace",
          text: "在工作区中查找…",
          accelerator: "CmdOrCtrl+Shift+F",
          action: () => emit("lunark:menu-find-workspace"),
        }),
      ],
    });

    const view = await Submenu.new({
      text: "视图",
      items: [
        await MenuItem.new({
          id: "toggle-mode",
          text: "切换视图（混合 / 源码 / 双栏）",
          accelerator: "CmdOrCtrl+/",
          action: () => emit("lunark:menu-toggle-mode"),
        }),
        await MenuItem.new({
          id: "mode-hybrid",
          text: "混合",
          action: () => emit("lunark:menu-mode-hybrid"),
        }),
        await MenuItem.new({
          id: "mode-source",
          text: "源码",
          action: () => emit("lunark:menu-mode-source"),
        }),
        await MenuItem.new({
          id: "mode-split",
          text: "双栏",
          action: () => emit("lunark:menu-mode-split"),
        }),
        await MenuItem.new({
          id: "toggle-sidebar",
          text: "侧栏",
          accelerator: "CmdOrCtrl+\\",
          action: () => emit("lunark:menu-toggle-sidebar"),
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: "toggle-focus",
          text: "专注模式",
          accelerator: "F8",
          action: () => emit("lunark:menu-toggle-focus"),
        }),
        await MenuItem.new({
          id: "toggle-typewriter",
          text: "打字机模式",
          accelerator: "F9",
          action: () => emit("lunark:menu-toggle-typewriter"),
        }),
        await MenuItem.new({
          id: "toggle-status-bar",
          text: "状态栏",
          action: () => emit("lunark:menu-toggle-status-bar"),
        }),
      ],
    });

    const themeItems = await Promise.all(
      BUILTIN_THEMES.map((t) =>
        CheckMenuItem.new({
          id: `theme-${t.id}`,
          text: t.label,
          checked: theme.themeId === t.id,
          action: () => emit("lunark:menu-theme", t.id as ThemeId),
        }),
      ),
    );

    const themeMenu = await Submenu.new({
      text: "主题",
      items: themeItems,
    });

    const menu = await Menu.new({ items: [file, edit, view, themeMenu] });
    await menu.setAsAppMenu();
  } catch (e) {
    console.warn("[lunark] setupAppMenu failed", e);
  }
}
