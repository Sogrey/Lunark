# Lunark（月刻）

轻量跨平台本地 Markdown 编辑器。壳用 **Tauri 2**；一期 **方案 B：CodeMirror 6 双栏 + markdown-it**；二期默认 **Milkdown Crepe 混合编辑**（Typora 风格局部语法糖），Night 暗色优先，内置多主题可切换。

> **一体化 WYSIWYG（二期）** → [docs/PHASE2-WYSIWYG.md](docs/PHASE2-WYSIWYG.md)

## 当前进度（2026-08-08）

| 层级 | 状态 |
|---|---|
| 一期 MVP（双栏 + 导出 Typst + 打磨） | ✅ |
| 二期混合编辑（Crepe · M1–M4） | ✅ |
| Typora 风局部语法糖（选中露源码 / 光标露分隔符） | ✅ |
| 布局精简（无工具栏 · 菜单 + 状态栏） | ✅ |
| 主题（内置五套 + 自定义 CSS 导入） | ✅ |
| 右键菜单 / 表格浮动工具条 / 帮助（F1） | ✅ |
| 标签会话 / 最近打开 / 工作区搜索 | ✅ |
| 导出 HTML · PDF · Word · PNG | ✅ |
| Windows NSIS 安装包 | ✅ |
| 工程整理（`hybrid/` 拆分 · 导出编排 · 依赖瘦身） | ✅ |
| i18n（简中 / 繁中 / 英 / 韩 / 日 · 编辑器+Toast） | ✅ |
| 轻量单测（vitest） | ✅ |
| Vim · Crepe 切 Tab · 图床 | ⏸ 预留（暂不做） |

详见 [PROGRESS](docs/PROGRESS.md) · [ROADMAP](docs/ROADMAP.md) · [PHASE2-WYSIWYG](docs/PHASE2-WYSIWYG.md)

### 建议下一步

1. **预留**：Vim / Crepe 切 Tab / 图床（见 [PROGRESS](docs/PROGRESS.md)「预留 / 已知债」；暂不排期）
2. 日常打磨与 [QA-SMOKE](docs/QA-SMOKE.md) 回归

## 开发

```bash
pnpm setup
pnpm tauri:dev
pnpm tauri:build
```

- 包管理仅 **pnpm**
- Windows 打包目标为 **NSIS**（`targets: ["nsis"]`）；产物示例：`src-tauri/target/release/bundle/nsis/Lunark_*_x64-setup.exe`
- 更换应用图标：编辑根目录 `app-icon.svg` 后执行 `pnpm exec tauri icon app-icon.svg`，并**完整重启** `tauri:dev`（任务栏读 exe 内嵌图标）

扩展语法：````mermaid` / `$...$`·`$$...$$` / 围栏代码高亮。

### 快捷键

| 操作 | 快捷键 |
|---|---|
| 打开文件 | `Ctrl+O` |
| 打开文件夹 | `Ctrl+Shift+O` |
| 新建 | `Ctrl+N` |
| 保存 | `Ctrl+S` |
| 另存为 | `Ctrl+Shift+S` |
| 关闭标签 | `Ctrl+W` |
| 退出 | `Ctrl+Q` |
| 下一个 / 上一个标签 | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| 混合 / 源码 / 双栏 | `Ctrl+/`（循环：混合 → 源码 → 双栏） |
| 侧栏 | `Ctrl+\` |
| 专注模式 | `F8`（`Esc` 退出） |
| 打字机模式 | `F9` |
| 查找 | `Ctrl+F`（混合模式下会自动切到源码） |
| 查找并替换 | `Ctrl+H` |
| 工作区搜索 | `Ctrl+Shift+F` |
| 快捷键说明 | `F1` |

菜单：**文件 / 编辑 / 视图 / 主题 / 语言 / 帮助**（视图、主题、语言项带勾选；可「导入主题 CSS…」）。

语言：简体中文 / 繁體中文 / English / 한국어 / 日本語；写入 prefs，重启后保持。默认跟随系统语言（无法匹配时用简体中文）。

自定义主题示例：[`themes/examples/`](themes/examples/)（`slate.css` / `paper.css`）。选择器请写 `[data-theme="custom"]`，可选文件头：

```css
/* lunark-theme: 显示名 */
/* lunark-dark: true */
```

## 文档

- [PROGRESS](docs/PROGRESS.md) · [ROADMAP](docs/ROADMAP.md) · [PRD](docs/PRD.md) · [PHASE2-WYSIWYG](docs/PHASE2-WYSIWYG.md) · [QA-SMOKE](docs/QA-SMOKE.md)
