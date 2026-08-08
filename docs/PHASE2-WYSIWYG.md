# 二期：一体化 WYSIWYG 改造说明

> **二期核心完成（核对 2026-08-08）。** 对标 Typora。  
> 一期进度见 [PROGRESS.md](./PROGRESS.md)。

## 锁定决策

| 项 | 选择 |
|---|---|
| 内核 | **Milkdown Crepe** |
| 范围 | **中**：IR 混合 + Focus/打字机/字数；主题；Word/图片导出；图床后置 |
| 默认视图 | **hybrid（混合）** |
| 降级保留 | `source`（CM6 全源码）、`split`（一期双栏） |
| 落盘 | 始终标准 `.md` |
| 壳层 | 无中间工具栏；原生菜单 + Typora 风图标 `StatusBar` |

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
| **壳层** | 去 Toolbar / MenuChrome；图标状态栏；右键菜单；表格浮动条 | **完成** |
| **M4 主题** | 内置五套 + 自定义 CSS 导入/文件夹；prefs；CM/Mermaid 明暗 | **完成** |
| **M4 导出** | Word（.doc）/ 图片（.png）；编排见 `lib/export/runExports` | **完成** |
| **局部语法糖** | 选中露图片/公式/Mermaid 源码；光标露分隔符；空标题始终露 `#` | **完成** |
| **M4 余量** | 图床 | **⏸ 预留暂不做** |

## 改造原则

1. 保持 `.md` 纯源码落盘，不引入专有格式。
2. 预览 / Crepe 样式尽量复用 CSS 变量（Night 及亮色主题）。
3. 双栏与全源码作为降级开关保留。
4. Typst PDF 导出管线不因 WYSIWYG 重写。
5. 右键块级操作与 Crepe 行首「+」同源（`crepeCommands`）。

## M2 交付说明

- **Latex / 表格 / 列表**：Crepe 内置 Feature 开启。
- **代码块**：CodeMirror + oneDark + `language-data`；语言搜索中文文案。
- **Mermaid**：非原生节点；代码块语言选 `mermaid` 后用「预览」走一期 `renderMermaidSvg`。
- **图片**：ImageBlock 上传写入 `./assets/`；`proxyDomURL` 解析相对路径；拖放仍走 `imageInput`（未保存文档时提示先保存）。
- **TOC**：混合模式无 CM 时 `jumpToLine` 先切 `source` 并等待 CM 就绪。
- **查找**：依赖源码模式（CM6 SearchBar）；混合下打开查找会提示并自动切换。

## M3 交付说明

- **字数**：底栏 `StatusBar` — 词（CJK 按字 + 拉丁词）/ 字符 / 行；有选区时显示选中字符数。
- **专注（F8）**：隐藏侧栏与 Tab 条，内容栏收窄居中；顶栏半透明；`Esc` 退出。
- **打字机（F9）**：源码 CM6 `scrollMargins` + 滚光标至中部；混合模式对选区 `scrollTo` 居中。
- **prefs**：`focusMode` / `typewriterMode` / `statusBarVisible` 持久化。
- **菜单**：视图 → 专注 / 打字机 / 状态栏。

## 主题（M4）

- 菜单 **主题**：Github / Newsprint / Night / Pixyll / Whitey；其下为已导入自定义主题。
- **导入主题 CSS…** / **打开主题文件夹** / **移除当前自定义主题**。
- 自定义文件存于应用配置目录 `themes/`；示例见仓库 `themes/examples/`。
- 选择器：`[data-theme="custom"]`；可选头 `lunark-theme` / `lunark-dark`。
- `themeId`（含 `custom:<slug>`）写入 prefs；`data-theme-mode` 驱动 CM/Mermaid 明暗。

## Word / 图片导出

- 菜单 **文件 → 导出 Word…** / **导出图片…**
- Word：HTML Word 兼容格式（.doc，Word/WPS 可开；避免 Node 依赖白屏）
- 图片：印刷样式渲染后 `html-to-image` 截为 PNG（2x）
- 与 HTML/PDF 相同：未保存文档时相对路径图片需确认

## 局部语法糖（Typora 风）

实现：`src/lib/editor/hybrid/*`（入口兼容 `hybridSourceMarks.ts`）。

- 选中图片 / 行内公式：上方可编辑源码条（关掉公式弹窗）
- Mermaid / 块级公式：未选中仅预览；选中后上方露源码
- 光标在粗斜体 / 行内代码 / 链接 / 标题内：露出 Markdown 分隔符
- 空标题始终显示 `#`；表格不动

## 建议下一迭代

1. **预留**：Vim、Crepe 切 Tab、图床 — 详见 [PROGRESS.md](./PROGRESS.md)「预留 / 已知债」（均暂不排期）  

已还债：多表格 DOM 匹配、Shiki 随明暗、帮助（关于 / F1）、工程拆分与依赖瘦身、i18n 编辑器层。
