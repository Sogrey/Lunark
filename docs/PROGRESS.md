# 开发进度日志

> 对照仓库代码盘点。最近核对：**2026-08-08**。

## 总览

| 阶段 | 范围 | 进度 |
|---|---|---|
| 工程基建 | Tauri2 + Vue3 + pnpm 锁定 + 插件 | **完成** |
| 一期 MVP（方案 B 双栏） | 见 [ROADMAP.md](./ROADMAP.md) | **完成（含打磨）** |
| 二期 | WYSIWYG（Milkdown Crepe）对标 Typora | **核心完成 · M4 部分（内置主题）** |
| 三期 | 会话 / 全局搜索 / Vim | **进行中 · Vim 待做** |

## 已完成清单

| 模块 | 状态 | 关键位置 |
|---|---|---|
| 双栏 CM6 + Night + GFM | ✅ | `editor/`、`styles/themes` |
| 工作区 / Tab / TOC / 图片 | ✅ | 含 Tauri 拖放、文件名净化 |
| Mermaid / KaTeX / Shiki | ✅ | Shiki 按需加载语言 |
| 滚动联动 + 查找替换 + store | ✅ | prefs + SearchBar |
| 关窗 / 关 Tab（保存·不保存·取消） | ✅ | `askSaveDiscardCancel` + `useWindowLifecycle` |
| 任务列表只读 / 导出未保存提示 | ✅ | renderer + documentActions |
| 预览链接（md Tab / 外链 / mailto / 本地文件） | ✅ | PreviewPane + opener |
| 切 Tab 保留撤销栈 | ✅ | `tabEditorStates` |
| Welcome 被真文件替换 | ✅ | `tabs.openOrFocus` |
| 原生菜单 + 快捷键（防双触发） | ✅ | `appMenu` + `useMenuBridge`（无 Toolbar） |
| Ctrl+Tab 切标签 | ✅ | `useMenuBridge` |
| 窗口几何持久化 | ✅ | prefs.window |
| 外部文件变更提示重载 | ✅ | `useExternalFileWatch` |
| 导出 HTML / PDF（Typst） | ✅ | 见下 |
| 查找匹配计数 / 全部替换确认 | ✅ | SearchBar |
| Crepe 混合编辑（M1–M3） | ✅ | `HybridEditor` + Focus / 打字机 / 字数 |
| 布局精简 | ✅ | `MenuChrome` + `StatusBar`；去 `Toolbar` |
| 内置主题菜单 | ✅ | 主题：Github / Newsprint / Night / Pixyll / Whitey |
| 右键菜单 / 表格浮动条 | ✅ | `EditorContextMenu`、`TableToolbar`；块动作对齐 Crepe「+」 |
| 会话 / 最近打开 / 工作区搜索 | ✅ | `session` store、`GlobalSearchPanel` |
| 应用图标（月刻） | ✅ | `app-icon.svg` → `tauri icon` |
| Windows NSIS 安装包 | ✅ | `bundle.targets: ["nsis"]` |

### PDF 导出（Typst）细节

| 能力 | 状态 | 说明 |
|---|---|---|
| MD → Typst → PDF | ✅ | `md_typst` + `pdf`；失败可回退系统打印 |
| 中文（CJK） | ✅ | 内置 Source Han Sans OTF；已修 UTF-8 占位抽取 |
| 异步导出 | ✅ | `spawn_blocking`，避免卡 UI |
| 数学公式 | ✅ | LaTeX → Typst math（常见子集）；嵌入 New Computer Modern Math |
| Mermaid | ✅ | 预渲染后 **栅格化为 PNG** 嵌入（避免 SVG foreignObject 丢字） |
| 脚注 / 嵌套列表 | ✅ | `#footnote[...]`；列表按深度缩进 |

## 建议下一迭代

| 优先级 | 项 |
|---|---|
| 可选 | 三期 **Vim** 编辑模式 |
| 后置 M4 余量 | 自定义主题 CSS 导入、图床、Word / 图片导出 |
| 体验债 | 混合模式多表格身份匹配、Shiki 随亮色主题切换 |

## 迭代记录

| 日期 | 内容 |
|---|---|
| 2026-08-06 | 方案 B 脚手架 → 双栏 / 工作区 / 扩展渲染 |
| 2026-08-06 | store / 搜索 / 图片拖贴 / 特殊文件名 |
| 2026-08-06 | 一期收尾打磨：关窗、标题、菜单、链接、Tab 状态等 |
| 2026-08-07 | Typst PDF：CJK、UTF-8 修复、公式/Mermaid、异步导出 |
| 2026-08-07 | 一期打磨：脚注/嵌套列表、预览链接、菜单对齐、搜索计数 |
| 2026-08-07 | Mermaid PNG 栅格化；关窗 allow-destroy |
| 2026-08-07 | 关窗保存三选一、侧栏文案、外部变更监听、Ctrl+Tab；**一期收口** |
| 2026-08-07 | **二期启动 M1**：Milkdown Crepe 混合视图 + hybrid/source/split |
| 2026-08-07 | **二期 M2**：Crepe Latex/CodeMirror/ImageBlock；Mermaid `renderPreview`；TOC 混合跳转 |
| 2026-08-07 | **二期 M3**：字数状态栏、Focus（F8）、打字机（F9）、prefs |
| 2026-08-07 | **三期启动**：标签会话记忆 + 最近打开（侧栏/菜单） |
| 2026-08-07 | **三期**：工作区全局搜索（侧栏「搜索」· Ctrl+Shift+F） |
| 2026-08-08 | 布局精简：去工具栏；标题含模式；MenuChrome；Typora 风状态栏 |
| 2026-08-08 | 右键菜单 / 表格浮动工具条；块动作与 Crepe「+」同源 |
| 2026-08-08 | **主题菜单**：五套内置主题 + prefs 持久化；CM/Mermaid 随明暗适配 |
| 2026-08-08 | 应用图标（月刻 SVG）；运行时 `set_icon`；NSIS 打包（规避 WiX 超时） |
| 2026-08-08 | 风险修复：`jumpToLine` 等 CM 就绪、查找切源码提示、`clearFormatBridge` |
