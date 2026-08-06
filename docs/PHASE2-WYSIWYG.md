# 二期：一体化 WYSIWYG 改造说明

> **一期明确不做。** 本文仅作边界与预研备忘，避免 MVP 范围膨胀。  
> 一期进度见 [PROGRESS.md](./PROGRESS.md)（约 95%：双栏 + 工作区 + TOC + 图片 + Mermaid/KaTeX/Shiki）。

## 一期交付形态（已实现）

- 左：CodeMirror 6 源码编辑；右：markdown-it 实时预览（Night）
- 工作区文件树、多 Tab、大纲 TOC、本地图片 asset、导出 HTML/PDF
- Mermaid / KaTeX / Shiki 扩展渲染
- `Ctrl+/` 切换「仅源码 / 双栏」（一期不做块级混合编辑）
- 一期剩余：配置持久化、搜索 UI

## 二期目标

混合编辑：光标进入块 → 源码；移出 → 渲染；全源码模式保留。

## 候选内核（二期再定）

| 方案 | 库 | 备注 |
|---|---|---|
| A | Milkdown（ProseMirror） | HorseMD 同路线 |
| B | TipTap | InkDown 同路线 |
| C | Vditor IR | MarkMate 同路线 |
| D | 自研 CM6 块映射 | 成本最高，不优先 |

## 改造原则

1. 保持 `.md` 纯源码落盘，不引入专有格式。
2. 预览样式（Night CSS）尽量复用一期 `styles/themes`。
3. 双栏模式可作为「源码模式」保留，或降级开关。
4. 不在一期预埋半成品 ProseMirror 代码。
