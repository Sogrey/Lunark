import { isTauri } from "@tauri-apps/api/core";
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";

/**
 * 原生菜单。快捷键由菜单 accelerator 触发（前端不再重复绑定同名 Ctrl 组合键）。
 */
export async function setupAppMenu(): Promise<void> {
  if (!isTauri()) return;

  const emit = (name: string) => {
    window.dispatchEvent(new CustomEvent(name));
  };

  try {
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
      ],
    });

    const view = await Submenu.new({
      text: "视图",
      items: [
        await MenuItem.new({
          id: "toggle-mode",
          text: "仅源码 / 双栏",
          accelerator: "CmdOrCtrl+/",
          action: () => emit("lunark:menu-toggle-mode"),
        }),
        await MenuItem.new({
          id: "toggle-sidebar",
          text: "侧栏",
          action: () => emit("lunark:menu-toggle-sidebar"),
        }),
      ],
    });

    const menu = await Menu.new({ items: [file, edit, view] });
    await menu.setAsAppMenu();
  } catch (e) {
    console.warn("[lunark] setupAppMenu failed", e);
  }
}
