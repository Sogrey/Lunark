# 二期：一体化 WYSIWYG 改造说明

> **二期进行中（2026-08-07 起）。** 对标 Typora。  
> 一期进度见 [PROGRESS.md](./PROGRESS.md)。

## 锁定决策

| 项 | 选择 |
|---|---|
| 内核 | **Milkdown Crepe** |
| 范围 | **中**：IR 混合 + Focus/打字机/字数（M3）；主题/Word/图床后置 |
| 默认视图 | **hybrid（混合）** |
| 降级保留 | `source`（CM6 全源码）、`split`（一期双栏） |
| 落盘 | 始终标准 `.md` |

`Ctrl+/`：混合 → 源码 → 双栏 → 混合。

## 一期交付形态（已实现）

- 左：CodeMirror 6 源码编辑；右：markdown-it 实时预览（Night）
- 工作区文件树、多 Tab（Ctrl+Tab）、大纲 TOC、本地图片 asset
- 导出 HTML / PDF（Typst）
- 偏好持久化；关窗三选一；外部文件变更；原生菜单

## 二期里程碑

| 里程碑 | 内容 | 状态 |
|---|---|---|
| **M1** | Crepe `HybridEditor` + `hybrid\|source\|split`，默认混合，Tab 同步 | **完成** |
| **M2** | KaTeX / 代码高亮 / Mermaid 预览 / 图片上传·本地代理 / TOC 跳转 | **完成** |
| **M3** | 字数统计 + Focus + 打字机 + prefs | **完成** |
| **M4** | 主题 CSS / 图床 / Word·图片导出（后置） | 未开始 |

## 改造原则

1. 保持 `.md` 纯源码落盘，不引入专有格式。
2. 预览 / Crepe 样式尽量复用一期 Night CSS 变量。
3. 双栏与全源码作为降级开关保留。
4. Typst PDF 导出管线不因 WYSIWYG 重写。

## M2 交付说明

- **Latex / 表格 / 列表**：Crepe 内置 Feature 开启。
- **代码块**：CodeMirror + oneDark + `language-data`；语言搜索中文文案。
- **Mermaid**：非原生节点；代码块语言选 `mermaid` 后用「预览」走一期 `renderMermaidSvg`。
- **图片**：ImageBlock 上传写入 `./assets/`；`proxyDomURL` 解析相对路径；拖放仍走 `imageInput`（未保存文档时提示先保存）。
- **TOC**：混合模式无 CM 行号时先切到 `source` 再跳行。
- **查找**：仍依赖切到源码模式（CM6 SearchBar）。

## 建议下一迭代（M4 · 后置）

自定义主题 CSS、图床/图片管理、Word·图片导出。中范围二期核心（M1–M3）已齐。

## M3 交付说明

- **字数**：底栏 `StatusBar` — 词（CJK 按字 + 拉丁词）/ 字符 / 行；有选区时显示选中字符数。
- **专注（F8）**：隐藏侧栏与 Tab 条，内容栏收窄居中；顶栏半透明；`Esc` 退出。
- **打字机（F9）**：源码 CM6 `scrollMargins` + 滚光标至中部；混合模式对选区 `scrollTo` 居中。
- **prefs**：`focusMode` / `typewriterMode` / `statusBarVisible` 持久化。
- **菜单**：视图 → 专注 / 打字机 / 状态栏。
