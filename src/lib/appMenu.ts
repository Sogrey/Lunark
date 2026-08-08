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
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { BUILTIN_THEMES, type ThemeId } from "@/lib/theme/catalog";
import {
  getLocale,
  LOCALE_IDS,
  LOCALE_MENU_KEYS,
  t,
  type LocaleId,
} from "@/lib/i18n";

/**
 * 原生菜单。accelerator 用于菜单旁显示快捷键；
 * Windows/WebView2 下加速键常不可靠，实际触发以 useMenuBridge 前端绑定为准（带防双触发）。
 * 文案全部走 i18n，避免系统预定义项语言与自定义项混杂。
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
    const editor = useEditorStore();
    const workspace = useWorkspaceStore();
    const locale = getLocale();

    const recentItems: Array<
      MenuItem | PredefinedMenuItem | Submenu | CheckMenuItem
    > =
      session.recentFiles.length === 0
        ? [
            await MenuItem.new({
              id: "recent-empty",
              text: t("menu.recentEmpty"),
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
          text: t("menu.recentClear"),
          action: () => emit("lunark:menu-clear-recent"),
        }),
      );
    }

    const recentSub = await Submenu.new({
      text: t("menu.recent"),
      items: recentItems,
    });

    const file = await Submenu.new({
      text: t("menu.file"),
      items: [
        await MenuItem.new({
          id: "open",
          text: t("menu.open"),
          accelerator: "CmdOrCtrl+O",
          action: () => emit("lunark:menu-open"),
        }),
        await MenuItem.new({
          id: "open-folder",
          text: t("menu.openFolder"),
          accelerator: "CmdOrCtrl+Shift+O",
          action: () => emit("lunark:menu-open-folder"),
        }),
        recentSub,
        await MenuItem.new({
          id: "new",
          text: t("menu.new"),
          accelerator: "CmdOrCtrl+N",
          action: () => emit("lunark:menu-new"),
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: "save",
          text: t("menu.save"),
          accelerator: "CmdOrCtrl+S",
          action: () => emit("lunark:menu-save"),
        }),
        await MenuItem.new({
          id: "save-as",
          text: t("menu.saveAs"),
          accelerator: "CmdOrCtrl+Shift+S",
          action: () => emit("lunark:menu-save-as"),
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: "export-html",
          text: t("menu.exportHtml"),
          action: () => emit("lunark:menu-export-html"),
        }),
        await MenuItem.new({
          id: "export-pdf",
          text: t("menu.exportPdf"),
          action: () => emit("lunark:menu-export-pdf"),
        }),
        await MenuItem.new({
          id: "export-docx",
          text: t("menu.exportDocx"),
          action: () => emit("lunark:menu-export-docx"),
        }),
        await MenuItem.new({
          id: "export-png",
          text: t("menu.exportPng"),
          action: () => emit("lunark:menu-export-png"),
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: "close-tab",
          text: t("menu.closeTab"),
          accelerator: "CmdOrCtrl+W",
          action: () => emit("lunark:menu-close-tab"),
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: "quit",
          text: t("menu.quit"),
          accelerator: "CmdOrCtrl+Q",
          action: () => emit("lunark:menu-quit"),
        }),
      ],
    });

    const edit = await Submenu.new({
      text: t("menu.edit"),
      items: [
        await MenuItem.new({
          id: "undo",
          text: t("menu.undo"),
          accelerator: "CmdOrCtrl+Z",
          action: () => emit("lunark:menu-undo"),
        }),
        await MenuItem.new({
          id: "redo",
          text: t("menu.redo"),
          accelerator: "CmdOrCtrl+Shift+Z",
          action: () => emit("lunark:menu-redo"),
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: "cut",
          text: t("menu.cut"),
          accelerator: "CmdOrCtrl+X",
          action: () => emit("lunark:menu-cut"),
        }),
        await MenuItem.new({
          id: "copy",
          text: t("menu.copy"),
          accelerator: "CmdOrCtrl+C",
          action: () => emit("lunark:menu-copy"),
        }),
        await MenuItem.new({
          id: "paste",
          text: t("menu.paste"),
          accelerator: "CmdOrCtrl+V",
          action: () => emit("lunark:menu-paste"),
        }),
        await MenuItem.new({
          id: "select-all",
          text: t("menu.selectAll"),
          accelerator: "CmdOrCtrl+A",
          action: () => emit("lunark:menu-select-all"),
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: "find",
          text: t("menu.find"),
          accelerator: "CmdOrCtrl+F",
          action: () => emit("lunark:menu-find"),
        }),
        await MenuItem.new({
          id: "replace",
          text: t("menu.replace"),
          accelerator: "CmdOrCtrl+H",
          action: () => emit("lunark:menu-replace"),
        }),
        await MenuItem.new({
          id: "find-in-workspace",
          text: t("menu.findWorkspace"),
          accelerator: "CmdOrCtrl+Shift+F",
          action: () => emit("lunark:menu-find-workspace"),
        }),
      ],
    });

    const view = await Submenu.new({
      text: t("menu.view"),
      items: [
        await MenuItem.new({
          id: "toggle-mode",
          text: t("menu.toggleMode"),
          accelerator: "CmdOrCtrl+/",
          action: () => emit("lunark:menu-toggle-mode"),
        }),
        await CheckMenuItem.new({
          id: "mode-hybrid",
          text: t("menu.modeHybrid"),
          checked: editor.viewMode === "hybrid",
          action: () => emit("lunark:menu-mode-hybrid"),
        }),
        await CheckMenuItem.new({
          id: "mode-source",
          text: t("menu.modeSource"),
          checked: editor.viewMode === "source",
          action: () => emit("lunark:menu-mode-source"),
        }),
        await CheckMenuItem.new({
          id: "mode-split",
          text: t("menu.modeSplit"),
          checked: editor.viewMode === "split",
          action: () => emit("lunark:menu-mode-split"),
        }),
        await CheckMenuItem.new({
          id: "toggle-sidebar",
          text: t("menu.sidebar"),
          checked: workspace.sidebarVisible,
          accelerator: "CmdOrCtrl+\\",
          action: () => emit("lunark:menu-toggle-sidebar"),
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await CheckMenuItem.new({
          id: "toggle-focus",
          text: t("menu.focusMode"),
          checked: editor.focusMode,
          accelerator: "F8",
          action: () => emit("lunark:menu-toggle-focus"),
        }),
        await CheckMenuItem.new({
          id: "toggle-typewriter",
          text: t("menu.typewriterMode"),
          checked: editor.typewriterMode,
          accelerator: "F9",
          action: () => emit("lunark:menu-toggle-typewriter"),
        }),
        await CheckMenuItem.new({
          id: "toggle-status-bar",
          text: t("menu.statusBar"),
          checked: editor.statusBarVisible,
          action: () => emit("lunark:menu-toggle-status-bar"),
        }),
      ],
    });

    const builtinItems = await Promise.all(
      BUILTIN_THEMES.map((th) =>
        CheckMenuItem.new({
          id: `theme-${th.id}`,
          text: th.label,
          checked: theme.themeId === th.id,
          action: () => emit("lunark:menu-theme", th.id as ThemeId),
        }),
      ),
    );

    const themeItems: Array<
      MenuItem | PredefinedMenuItem | Submenu | CheckMenuItem
    > = [...builtinItems];

    if (theme.customThemes.length > 0) {
      themeItems.push(await PredefinedMenuItem.new({ item: "Separator" }));
      for (const c of theme.customThemes) {
        themeItems.push(
          await CheckMenuItem.new({
            id: `theme-${c.id}`,
            text: c.label,
            checked: theme.themeId === c.id,
            action: () => emit("lunark:menu-theme", c.id),
          }),
        );
      }
    }

    themeItems.push(await PredefinedMenuItem.new({ item: "Separator" }));
    themeItems.push(
      await MenuItem.new({
        id: "theme-import",
        text: t("menu.themeImport"),
        action: () => emit("lunark:menu-theme-import"),
      }),
    );
    themeItems.push(
      await MenuItem.new({
        id: "theme-folder",
        text: t("menu.themeFolder"),
        action: () => emit("lunark:menu-theme-folder"),
      }),
    );
    if (theme.isCustomActive) {
      themeItems.push(
        await MenuItem.new({
          id: "theme-remove",
          text: t("menu.themeRemove"),
          action: () => emit("lunark:menu-theme-remove"),
        }),
      );
    }

    const themeMenu = await Submenu.new({
      text: t("menu.theme"),
      items: themeItems,
    });

    const langItems = await Promise.all(
      LOCALE_IDS.map((id: LocaleId) =>
        CheckMenuItem.new({
          id: `lang-${id}`,
          text: t(LOCALE_MENU_KEYS[id]),
          checked: locale === id,
          action: () => emit("lunark:menu-locale", id),
        }),
      ),
    );

    const languageMenu = await Submenu.new({
      text: t("menu.language"),
      items: langItems,
    });

    const help = await Submenu.new({
      text: t("menu.help"),
      items: [
        await MenuItem.new({
          id: "help-about",
          text: t("menu.about"),
          action: () => emit("lunark:help", "about"),
        }),
        await MenuItem.new({
          id: "help-shortcuts",
          text: t("menu.shortcuts"),
          accelerator: "F1",
          action: () => emit("lunark:help", "shortcuts"),
        }),
      ],
    });

    const menu = await Menu.new({
      items: [file, edit, view, themeMenu, languageMenu, help],
    });
    await menu.setAsAppMenu();
  } catch (e) {
    console.warn("[lunark] setupAppMenu failed", e);
  }
}
