# 开发进度日志

> 对照仓库代码盘点。最近核对：**2026-08-08**。

## 总览

| 阶段 | 范围 | 进度 |
|---|---|---|
| 工程基建 | Tauri2 + Vue3 + pnpm 锁定 + 插件 | **完成** |
| 一期 MVP（方案 B 双栏） | 见 [ROADMAP.md](./ROADMAP.md) | **完成（含打磨）** |
| 二期 | WYSIWYG（Milkdown Crepe）对标 Typora | **核心完成 · M4 + 局部语法糖** |
| 三期 | 会话 / 全局搜索 / Vim | **会话·搜索完成 · Vim 预留** |
| 工程 | 模块拆分 / 依赖瘦身 / 冒烟清单 | **整理完成 · QA 基本完成** |
| i18n | 简中 / 繁中 / 英 / 韩 / 日 | **完成（菜单 + 壳层 + 编辑器/Toast）** |

## 已完成清单

| 模块 | 状态 | 关键位置 |
|---|---|---|
| 双栏 CM6 + Night + GFM | ✅ | `editor/`、`styles/themes` |
| 工作区 / Tab / TOC / 图片 | ✅ | 含 Tauri 拖放、文件名净化 |
| Mermaid / KaTeX / Shiki | ✅ | Shiki 按需加载语言；随明暗主题 |
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
| 导出 Word / 图片 | ✅ | `wordExport` / `imageExport`；编排 `runExports`；菜单文件 |
| 查找匹配计数 / 全部替换确认 | ✅ | SearchBar |
| Crepe 混合编辑（M1–M3） | ✅ | `HybridEditor` + Focus / 打字机 / 字数 |
| Typora 风局部语法糖 | ✅ | `src/lib/editor/hybrid/*`（选中露源码 / 光标露分隔符） |
| 工程整理 | ✅ | hybrid 拆分；去无用依赖；`useDocumentActions` 瘦身 |
| 布局精简 | ✅ | 仅 `StatusBar`（图标）；去中间工具栏 / `MenuChrome` |
| 主题（内置 + 自定义 CSS） | ✅ | 菜单导入；`themes/examples`；配置目录 `themes/` |
| 右键菜单 / 表格浮动条 | ✅ | `EditorContextMenu`、`TableToolbar`；多表 DOM 匹配 |
| 帮助（关于 / 快捷键） | ✅ | 菜单「帮助」· F1；`HelpDialog` |
| 会话 / 最近打开 / 工作区搜索 | ✅ | `session` store、`GlobalSearchPanel` |
| 应用图标（月刻） | ✅ | `app-icon.svg` → `tauri icon` |
| Windows NSIS 安装包 | ✅ | `bundle.targets: ["nsis"]` |
| i18n 多语言 | ✅ | `vue-i18n`；菜单/壳层/编辑器 UI/Toast；文件对话框标题；Crepe 随语言重建 |
| 轻量单测 | ✅ | vitest：`wordStats`、`normalizePrefs` |

### PDF 导出（Typst）细节

| 能力 | 状态 | 说明 |
|---|---|---|
| MD → Typst → PDF | ✅ | `md_typst` + `pdf`；失败可回退系统打印 |
| 中文（CJK） | ✅ | 内置 Source Han Sans OTF；已修 UTF-8 占位抽取 |
| 异步导出 | ✅ | `spawn_blocking`，避免卡 UI |
| 数学公式 | ✅ | LaTeX → Typst math（常见子集）；嵌入 New Computer Modern Math |
| Mermaid | ✅ | 预渲染后 **栅格化为 PNG** 嵌入（避免 SVG foreignObject 丢字） |
| 脚注 / 嵌套列表 | ✅ | `#footnote[...]`；列表按深度缩进 |

## 预留 / 已知债

### Crepe 混合 · 切 Tab 性能（预留，有实测卡顿再做）

| 项 | 说明 |
|---|---|
| **现状** | `EditorWorkspace`：`HybridEditor` 以 `:key="activeId(+locale)"` 隔离；切 Tab = 卸载旧实例（flush）+ 新建 Crepe，内容正确、串 Tab 已解 |
| **风险** | 大文档下 `Crepe.create()` 仍占主线程；`await` 不能搬到 Worker（需 DOM） |
| **可选方案 A** | 轻量：先绘壳 /「加载中」，`rAF` 或短延迟再挂载 — 改善体感 |
| **可选方案 B** | 根治：未激活 Tab **缓存 Crepe 实例**（隐藏不销毁）— 切换快，换内存 |
| **触发** | QA 大文档压测或用户反馈「切 Tab 明显卡」后再开；勿与正确性回退混做 |

相关：`HybridEditor.vue`、`EditorWorkspace.vue`；手测清单见 [QA-SMOKE.md](./QA-SMOKE.md) §3。

### Vim 编辑模式（预留，暂不做）

| 项 | 说明 |
|---|---|
| **含义** | 模态编辑（Normal / Insert / Visual），非内嵌完整 Neovim |
| **现状** | 未实现；路线图三期可选项 |
| **建议 MVP** | 仅 **源码 / 双栏** CM6 接入 `@replit/codemirror-vim` + 菜单开关 + prefs；状态栏显示模式可选 |
| **难点** | **混合 Crepe** 正文是 ProseMirror，整篇 Vim 不能只靠 CM 插件（CM 仅在代码块内） |
| **注意** | 与全局快捷键、`Esc`（关查找 / 退专注）需排优先级 |
| **触发** | 明确有源码侧 Vim 需求再开；默认不做混合全文 Vim |

### 图床 / 图片管理（预留，暂不做）

| 项 | 说明 |
|---|---|
| **含义** | 上传到图床拿 URL、或统一管理文档旁图片；非本地 `./assets/` 拖贴 |
| **现状** | 本地插图已可用（拖/贴 → `assets/`）；无远程图床、无独立图片库 UI |
| **可选方向** | 自建/第三方 API（需配置密钥）；或仅「资源管理」浏览当前文档 assets |
| **注意** | 与「纯本地、不强制云」产品定位冲突时需可选、默关 |
| **触发** | 明确有远程图/集中管理需求再开 |

## 建议下一迭代

| 优先级 | 项 |
|---|---|
| **预留** | Vim（暂不做） |
| **预留** | Crepe 切 Tab 性能（实测卡顿再做） |
| **预留** | 图床 / 图片管理（暂不做） |

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
| 2026-08-08 | 布局精简：去中间工具栏 / MenuChrome；状态栏图标化；标题含模式 |
| 2026-08-08 | 右键菜单 / 表格浮动工具条；块动作与 Crepe「+」同源 |
| 2026-08-08 | **主题菜单**：五套内置主题 + prefs 持久化；CM/Mermaid 随明暗适配 |
| 2026-08-08 | 应用图标（月刻 SVG）；运行时 `set_icon`；NSIS 打包（规避 WiX 超时） |
| 2026-08-08 | 风险修复：`jumpToLine` 等 CM 就绪、查找切源码提示、`clearFormatBridge` |
| 2026-08-08 | **自定义主题 CSS**：导入/文件夹/移除；示例 slate / paper |
| 2026-08-08 | **导出 Word / PNG**：菜单文件；Word 为 .doc（HTML 兼容）；PNG 用 html-to-image |
| 2026-08-08 | 打磨：多表格 DOM 匹配、Shiki 随明暗、帮助菜单、prefs 白名单；[QA-SMOKE](./QA-SMOKE.md) |
| 2026-08-08 | 工程复盘：拆分 `hybrid/` 语法糖模块；去无用依赖（milkdown/vue、vue-codemirror 等）与死导出 |
| 2026-08-08 | 导出编排抽到 `lib/export/runExports`；`useDocumentActions` 只保留打开/保存/工作区 |
| 2026-08-08 | **i18n**：vue-i18n 五语；原生菜单去系统预定义混排；语言菜单 + prefs |
| 2026-08-09 | **i18n 深化**：编辑器/右键/表格/查找/Toast/对话框；Crepe 随 locale 重建；vitest 起步 |
| 2026-08-09 | **预留记录**：Crepe 切 Tab 性能（延后挂载 vs 实例缓存；Worker 不可行） |
| 2026-08-09 | **预留记录**：Vim 模式暂不做（建议日后仅 CM6 MVP；混合全文另议） |
| 2026-08-09 | **预留记录**：图床 / 图片管理暂不做（本地 assets 已够用） |
| 2026-08-09 | 对照三次风险报告：加固自定义主题 `sanitizeCss`；R-15/R-10/R-11/R-16 复核为已缓解或可接受 |
| 2026-08-09 | 三次复检：采纳「一般可控」；补 R-09 BOM 归一化、开发态 i18n missing warn；R-03 仍预留 |
| 2026-08-09 | 窗口：按 Monitor.workArea 钳制防任务栏遮挡；混合/源码默认 980×700，双栏 1280×800 |
| 2026-08-09 | 四次风险：N-06 image/math cache.pos 对齐；R-05 `recentActions` 过期清理；N-07 调用点已确认 |
