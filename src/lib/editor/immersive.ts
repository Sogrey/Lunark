/**
 * 沉浸模式族（正交，可叠加）：
 * - 全屏（F11）：窗口 / 文档全屏，不管 UI 条
 * - Focus（F8）：藏侧栏与 Tab，正文居中收窄
 * - 打字机（F9）：光标垂直居中滚动
 *
 * Esc 退出阶梯（由菜单桥统一）：瞬时浮层 → 查找条 → Focus → 全屏。
 */

/** 已由各自 capture 监听处理的瞬时浮层；此处仅探测，避免抢 Esc */
export function hasImmersiveOverlay(): boolean {
  return !!document.querySelector(
    [
      ".img-lightbox",
      ".cmd-backdrop",
      ".help-backdrop",
      "[data-lunark-dialog]",
      ".ctx-menu",
    ].join(","),
  );
}
