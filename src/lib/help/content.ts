/** 帮助文案（与 useMenuBridge / 原生菜单对齐；action 经 i18n key） */

export { APP_VERSION } from "./credits";

export interface ShortcutRow {
  keys: string;
  /** vue-i18n key under help.* */
  actionKey: string;
  /** tauri=菜单加速键；browser=浏览器键绑定；both=两端 */
  where: "both" | "tauri" | "browser";
}

/** 冒烟与「快捷键说明」共用 */
export const SHORTCUT_ROWS: ShortcutRow[] = [
  { keys: "Ctrl+O", actionKey: "help.scOpen", where: "both" },
  { keys: "Ctrl+Shift+O", actionKey: "help.scOpenFolder", where: "both" },
  { keys: "Ctrl+N", actionKey: "help.scNew", where: "both" },
  { keys: "Ctrl+S", actionKey: "help.scSave", where: "both" },
  { keys: "Ctrl+Shift+S", actionKey: "help.scSaveAs", where: "both" },
  { keys: "Ctrl+W", actionKey: "help.scCloseTab", where: "both" },
  { keys: "Ctrl+Q", actionKey: "help.scQuit", where: "both" },
  {
    keys: "Ctrl+Tab / Ctrl+Shift+Tab",
    actionKey: "help.scNextPrevTab",
    where: "both",
  },
  { keys: "Ctrl+/", actionKey: "help.scToggleMode", where: "both" },
  { keys: "Ctrl+\\", actionKey: "help.scSidebar", where: "both" },
  { keys: "Ctrl+F", actionKey: "help.scFind", where: "both" },
  { keys: "Ctrl+H", actionKey: "help.scReplace", where: "both" },
  { keys: "Ctrl+Shift+F", actionKey: "help.scFindWorkspace", where: "both" },
  { keys: "F1", actionKey: "help.scHelp", where: "both" },
  { keys: "F8", actionKey: "help.scFocus", where: "both" },
  { keys: "F9", actionKey: "help.scTypewriter", where: "both" },
  { keys: "Esc", actionKey: "help.scEsc", where: "both" },
];
