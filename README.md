# Lunark（月刻）

轻量跨平台本地 Markdown 编辑器。壳用 **Tauri 2**；一期 **方案 B：CodeMirror 6 双栏 + markdown-it**；二期默认 **Milkdown Crepe 混合编辑**，Night 暗色优先，内置多主题可切换。

> **一体化 WYSIWYG（二期）** → [docs/PHASE2-WYSIWYG.md](docs/PHASE2-WYSIWYG.md)

## 当前进度（2026-08-08）

| 层级 | 状态 |
|---|---|
| 一期 MVP（双栏 + 导出 Typst + 打磨） | ✅ |
| 二期混合编辑（Crepe · M1–M3） | ✅ |
| 布局精简（无工具栏 · 菜单 + 状态栏） | ✅ |
| 内置主题菜单（Github / Newsprint / Night / Pixyll / Whitey） | ✅（M4 主题子集） |
| 右键菜单 / 表格浮动工具条 | ✅ |
| 标签会话 / 最近打开 / 工作区搜索 | ✅ |
| Windows NSIS 安装包 | ✅ |
| Vim 模式 · 图床 · Word 导出 | ⬜ |

详见 [PROGRESS](docs/PROGRESS.md) · [ROADMAP](docs/ROADMAP.md) · [PHASE2-WYSIWYG](docs/PHASE2-WYSIWYG.md)

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

菜单：**文件 / 编辑 / 视图 / 主题**（勾选当前主题）。

## 文档

- [PROGRESS](docs/PROGRESS.md) · [ROADMAP](docs/ROADMAP.md) · [PRD](docs/PRD.md) · [PHASE2-WYSIWYG](docs/PHASE2-WYSIWYG.md)
