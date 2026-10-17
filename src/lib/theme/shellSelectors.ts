/**
 * 壳层类名（菜单、大纲、文件树）没有对应 DOM，导入主题时只记录、不改写 CSS。
 */
const SHELL_CLASS =
  /\.(?:megamenu[\w-]*|outline-[\w-]*|file-list[\w-]*|file-node[\w-]*|sidebar-tabs|context-menu|nav-group[\w-]*)/g;

export function unmappedShellSelectors(css: string): string[] {
  const found = new Set<string>();
  for (const match of css.matchAll(SHELL_CLASS)) {
    if (match[0]) found.add(match[0]);
  }
  return [...found];
}
