# 二期：一体化 WYSIWYG 改造说明

> **二期核心完成（核对 2026-08-08）。** 对标 Typora。  
> 一期进度见 [PROGRESS.md](./PROGRESS.md)。

## 锁定决策

| 项 | 选择 |
|---|---|
| 内核 | **Milkdown Crepe** |
| 范围 | **中**：IR 混合 + Focus/打字机/字数；内置主题已交付；自定义 CSS / Word / 图床后置 |
| 默认视图 | **hybrid（混合）** |
| 降级保留 | `source`（CM6 全源码）、`split`（一期双栏） |
| 落盘 | 始终标准 `.md` |
| 壳层 | 无可见工具栏；原生菜单 + `MenuChrome` + Typora 风 `StatusBar` |

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
| **壳层** | 去 Toolbar；MenuChrome；状态栏；右键菜单；表格浮动条 | **完成** |
| **M4 子集** | 菜单「主题」五套内置 + prefs；CM/Mermaid 明暗适配 | **完成** |
| **M4 余量** | 自定义主题 CSS / 图床 / Word·图片导出 | **未开始** |

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

## 主题（M4 子集）

- 菜单 **主题**：Github / Newsprint / Night / Pixyll / Whitey（勾选当前项）。
- `data-theme` + CSS 变量；`themeId` 写入 prefs。
- 源码 CM 随明暗切换高亮；Mermaid 按主题明暗渲染。
- 自定义主题文件导入、图床、Word 导出仍后置。

## 建议下一迭代

M4 余量：自定义主题 CSS、图床/图片管理、Word·图片导出。  
体验债：混合模式多表格精确定位、预览 Shiki 随亮色主题。
