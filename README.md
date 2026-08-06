# Lunark（月刻）

轻量跨平台本地 Markdown 编辑器。壳用 **Tauri 2**；一期 **方案 B：CodeMirror 6 双栏 + markdown-it**，Night 暗色主题优先。

> **一体化 WYSIWYG 放二期** → [docs/PHASE2-WYSIWYG.md](docs/PHASE2-WYSIWYG.md)

## 当前进度（2026-08-06）

| 层级 | 状态 |
|---|---|
| 双栏 + Night + GFM + 工作区 / Tab / TOC / 图片 | ✅ |
| Mermaid · KaTeX · Shiki | ✅ |
| store 持久化 / 搜索 UI | ⬜ |
| 二期 WYSIWYG | ⬜ |

一期约 **95%**。[PROGRESS](docs/PROGRESS.md) · [ROADMAP](docs/ROADMAP.md)

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
| 仅源码 / 双栏 | `Ctrl+/` |

## 文档

- [PROGRESS](docs/PROGRESS.md) · [ROADMAP](docs/ROADMAP.md) · [PRD](docs/PRD.md) · [PHASE2-WYSIWYG](docs/PHASE2-WYSIWYG.md)
