# 开发进度日志

> 对照仓库代码盘点。最近核对：**2026-10-17**。

## 总览

| 阶段 | 范围 | 进度 |
|---|---|---|
| 工程基建 | Tauri2 + Vue3 + pnpm 锁定 + 插件 | **完成** |
| 一期 MVP（方案 B 双栏） | 见 [ROADMAP.md](./ROADMAP.md) | **完成（含打磨）** |
| 二期 | WYSIWYG（Milkdown Crepe 混合编辑） | **核心完成 · 混合源码条收尾** |
| 三期 | 会话 / 全局搜索 / Vim | **会话·搜索·i18n 完成 · Vim 预留** |
| 工程 | 模块拆分 / 依赖瘦身 / 冒烟 | **整理完成 · P0 QA 已验** |
| 分发 | Windows NSIS + CI 三平台 Release（暂不签名） | **持续进行** |
| 四期 | 安全 / 主题 / 口碑 / 差异化（桌面） | **桌面项已落地**（移动端壳预留，见 [PHASE4.md](./PHASE4.md)） |

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
| 窗口几何持久化 + workArea 钳制 | ✅ | `geometry` + `useWindowLifecycle`；启动：`window_geom.rs` + `bootstrapGeometry`（壳层就绪后再 show） |
| Crepe 切 Tab 缓存 | ✅ | `EditorWorkspace` LRU≤6；`HybridEditor` 延迟挂载 |
| 图床管理 UI | ✅ | `ImageHostDialog`；多配置；Crepe/粘贴/拖图同路径 |
| 四期桌面（安全/主题/口碑/差异化） | ✅ | 见 [PHASE4.md](./PHASE4.md) |
| 外部文件变更提示重载 | ✅ | `useExternalFileWatch` |
| 导出 HTML / PDF（Typst） | ✅ | 见下 |
| 导出 Word / 图片 | ✅ | `wordExport` / `imageExport`；编排 `runExports`；菜单文件 |
| 查找匹配计数 / 全部替换确认 | ✅ | SearchBar |
| Crepe 混合编辑（M1–M3） | ✅ | `HybridEditor` + Focus / 打字机 / 字数 |
| 局部语法糖（选中露源码） | ✅ | `src/lib/editor/hybrid/*` |
| **混合源码条 UX（08-09 收尾）** | ✅ | 见下节 |
| 工程整理 | ✅ | hybrid 拆分；去无用依赖；`useDocumentActions` 瘦身 |
| 布局精简 | ✅ | 仅 `StatusBar`（图标）；去中间工具栏 / `MenuChrome` |
| 主题（内置 + 自定义 CSS） | ✅ | 菜单导入；`themes/examples`；配置目录 `themes/` |
| 右键菜单 / 表格浮动条 | ✅ | `EditorContextMenu`、`TableToolbar`；多表 DOM 匹配 |
| 帮助（关于 / 快捷键） | ✅ | 菜单「帮助」· F1；`HelpDialog` |
| 会话 / 最近打开 / 工作区搜索 | ✅ | `session` store、`GlobalSearchPanel` |
| 应用图标（月刻） | ✅ | `app-icon.svg` → `tauri icon` |
| Windows NSIS 安装包 | ✅ | 本机 / CI；`bundle.targets` 含多平台 |
| CI 三平台 Release | ✅ | `.github/workflows/release.yml`（tag `v*` / 手动；暂不签名） |
| i18n 多语言 | ✅ | `vue-i18n`；菜单/壳层/编辑器 UI/Toast；Crepe 随语言重建 |
| 轻量单测 | ✅ | vitest：`wordStats`、`normalizePrefs`、`geometry`、`previewBlockSource` 等 |
| P0 冒烟 / QA-SMOKE | ✅ | 已手测一轮（2026-08-09） |

### 混合源码条 UX（2026-08-09 收尾）

选中图片 / 行内公式 / 块级公式 / Mermaid 时：

| 能力 | 说明 |
|---|---|
| 上方 Markdown 源码条 | 可编辑；右侧预留 padding + **垃圾桶删除**（不叠在渲染图上） |
| 多行源码条 | 删除按钮固定右上角（图片与块级一致） |
| 实时预览 | 源码 `input` 防抖提交（~120–160ms）；半成品不删节点 |
| 清空删除 | 源码清空后 Enter/blur → 整块删除；修空 latex 残留 `$$$$` |
| Mermaid 刷新 | Crepe `applyPreview` 异步回写；`renderMermaidSvg` 串行防并发卡死 |

关键：`hybrid/{sourceRowUi,imageSource,mathSource,previewBlockSource,blockDeleteUi}.ts`、`crepeConfig.ts`、`markdown/mermaid.ts`、`hybrid-crepe.css`。

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

> **暂不排期**。有明确需求或正式对外再开。

### Vim 编辑模式

| 项 | 说明 |
|---|---|
| **现状** | 未实现 |
| **建议 MVP** | 仅 **源码 / 双栏** CM6 + `@replit/codemirror-vim`；混合全文 Vim 另议 |
| **触发** | 明确有源码侧 Vim 需求再开 |

### 移动端壳

| 项 | 说明 |
|---|---|
| **现状** | 仅有 Tauri mobile 入口桩 |
| **触发** | 后续跨平台扩展有明确需求再开 |

### 代码签名 / Apple 公证

| 项 | 说明 |
|---|---|
| **现状** | CI 三平台产物**暂不签名** |
| **触发** | 正式对外分发再开 |

### 已知限制（已落地能力的尾巴）

| 项 | 说明 |
|---|---|
| Crepe 大文档 | 首次打开某 Tab 仍占主线程；缓存 LRU≤6，内存随打开 Tab 上升 |
| 图床 | 协议兼容 PicGo Server multipart；非通用 OAuth 图床 SDK |

## 建议下一迭代

| 优先级 | 项 |
|---|---|
| **持续** | 四期手测 + CI 三平台 Release / NSIS **内测分发** |
| **按需** | 内测反馈驱动的小修复 / 打磨 |
| **预留** | 移动端壳；Vim；代码签名 / Apple 公证 |

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
| 2026-08-09 | **预留记录**：Crepe 切 Tab / Vim / 图床（暂不排期） |
| 2026-08-09 | 风险报告：`sanitizeCss`、BOM 归一化、i18n missing warn；窗口 workArea 钳制 |
| 2026-08-09 | **混合源码条收尾**：删除按钮进源码条；实时预览；清空删块 / 修 `$$$$`；Mermaid `applyPreview` + 串行渲染 |
| 2026-08-09 | 四次风险：N-06 cache.pos；R-05 `recentActions` 清理；N-07 调用点确认 |
| 2026-08-09 | **P0 QA-SMOKE 已验**；进入 Windows NSIS **持续内测分发** |
| 2026-08-09 | **CI 三平台 Release**：`.github/workflows/release.yml`（Win NSIS / macOS DMG / Linux AppImage+deb；暂不签名） |
| 2026-10-17 | **四期立项**：范围写入 [PHASE4.md](./PHASE4.md)（安全基线 + 预览主题兼容） |
| 2026-10-17 | **四期第一批**：fs/asset scope 收敛 + `grant_user_path`；生产 CSP 去 `unsafe-eval`；预览 `#write` / 内容类名；Release 体积警告 |
| 2026-10-17 | **四期第二批**：表格粘贴/删行；PicGo；源码英文拼写；预览块缓存；Win11 Mica/Acrylic |
| 2026-10-17 | **四期第三批（桌面）**：Ollama 本地 AI；保存快照/恢复；`[[wiki-link]]` + 反链侧栏；移动端延后 |
| 2026-10-17 | **四期桌面余量**：Ollama 模型子菜单；快照列表对话框；当前文件 Git 只读时间线 |
| 2026-10-17 | **U3 自绘标题栏**：无系统边框 + 拖拽/三键；prefs / 视图菜单可切回系统装饰 |
| 2026-10-17 | **Crepe 切 Tab 缓存** + **图床管理 UI**（多配置）；移动端壳改预留 |
| 2026-10-17 | **启动窗口尺寸**：Rust `window_geom` + 延后 `show`，避免先小后大；文档小债对齐 |
