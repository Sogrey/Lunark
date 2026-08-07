# Lunark（月刻）

轻量跨平台本地 Markdown 编辑器。壳用 **Tauri 2**；一期 **方案 B：CodeMirror 6 双栏 + markdown-it**，Night 暗色主题优先。

> **一体化 WYSIWYG 放二期** → [docs/PHASE2-WYSIWYG.md](docs/PHASE2-WYSIWYG.md)

## 当前进度（2026-08-07 · 二期 M3）

| 层级 | 状态 |
|---|---|
| 一期 MVP（双栏 + 导出 Typst + 打磨） | ✅ |
| 二期混合编辑（Crepe：KaTeX / 代码 / Mermaid / 图片） | ✅ M1–M2 |
| Focus / 打字机 / 字数 | ✅ M3 |
| 标签会话 / 最近打开 | ✅ |
| 工作区全局搜索 | ✅ |
| Vim 模式 | ⬜ |

一期 **已完成**；二期见 [PHASE2-WYSIWYG](docs/PHASE2-WYSIWYG.md)。[PROGRESS](docs/PROGRESS.md) · [ROADMAP](docs/ROADMAP.md)

## 开发

```bash
pnpm setup
pnpm tauri:dev
pnpm tauri:build
```

包管理仅 **pnpm**。扩展语法：````mermaid` / `$...$`·`$$...$$` / 围栏代码高亮。

### 快捷键

| 操作 | 快捷键 |
|---|---|
| 打开文件 | `Ctrl+O` |
| 打开文件夹 | `Ctrl+Shift+O` |
| 新建 | `Ctrl+N` |
| 保存 | `Ctrl+S` |
| 另存为 | `Ctrl+Shift+S` |
| 关闭标签 | `Ctrl+W` |
| 下一个 / 上一个标签 | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| 仅源码 / 双栏 / 混合 | `Ctrl+/`（循环：混合 → 源码 → 双栏） |
| 专注模式 | `F8`（`Esc` 退出） |
| 打字机模式 | `F9` |
| 查找 | `Ctrl+F` |
| 查找并替换 | `Ctrl+H` |
| 工作区搜索 | `Ctrl+Shift+F` |

## 文档

- [PROGRESS](docs/PROGRESS.md) · [ROADMAP](docs/ROADMAP.md) · [PRD](docs/PRD.md) · [PHASE2-WYSIWYG](docs/PHASE2-WYSIWYG.md)
