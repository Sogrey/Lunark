# 开发进度日志

> 对照仓库代码盘点。最近核对：**2026-08-06**。

## 总览

| 阶段 | 范围 | 进度 |
|---|---|---|
| 工程基建 | Tauri2 + Vue3 + pnpm 锁定 + 插件 | **完成** |
| 一期 MVP（方案 B 双栏） | 见 [ROADMAP.md](./ROADMAP.md) | **约 95%** |
| 二期 | WYSIWYG 一体化 | **未开始** |
| 三期 | 会话 / 全局搜索 / Vim | **未开始** |

## 已完成清单

| 模块 | 状态 | 关键位置 |
|---|---|---|
| 脚手架 / pnpm 锁定 | ✅ | 根目录 |
| 双栏 CM6 + Night + GFM | ✅ | `editor/`、`styles/themes` |
| 单文件读写 / 导出 HTML·PDF | ✅ | `documentIo`、`htmlExport` |
| 工作区文件树 + 多 Tab | ✅ | `workspaceIo`、`tabs` |
| 相对路径图片 + 拖拽 `./assets/` | ✅ | `images`、`imageDrop` |
| 侧栏文件 / 大纲双 Tab + TOC | ✅ | `OutlinePanel`、`toc.ts` |
| **Mermaid 暗色图表** | ✅ | `mermaid.ts` + `enhance.ts` |
| **KaTeX 行内/块公式** | ✅ | `@mdit/plugin-katex` |
| **Shiki 代码高亮** | ✅ | `shiki.ts`（one-dark-pro） |
| Message / CM6 搜索键 | ◐ | 无独立搜索 UI |

## 未开始（一期剩余）

1. `plugin-store` 配置 / 最近工作区持久化  
2. 搜索替换独立 UI  

## 建议下一迭代

1. **store 持久化**（最近工作区、侧栏 Tab、分栏比例）  
2. 搜索替换面板  

## 迭代记录

| 日期 | 内容 |
|---|---|
| 2026-08-06 | 方案 B 脚手架；双栏 + Night |
| 2026-08-06 | 单文件 IO；导出；pnpm 锁定 |
| 2026-08-06 | 文件树 + 多 Tab；asset 图片；TOC 双 Tab |
| 2026-08-06 | Mermaid + KaTeX + Shiki 扩展渲染 |

## 源码结构（一期）

```
src/lib/markdown/
  renderer.ts   # markdown-it + katex + sanitize
  enhance.ts    # 围栏 → Shiki / Mermaid
  shiki.ts / mermaid.ts / toc.ts / images.ts
```
