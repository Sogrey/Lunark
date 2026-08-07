# Lunark（月刻）产品与技术说明

> 目标：基于 **Tauri 2.x + Vue3 + TS + Pinia + Vite + Element‑Plus(按需 Message)**，优先落地 Night 暗色主题，做轻量跨平台本地 Markdown 编辑器。  
> 实现进度以 [PROGRESS.md](./PROGRESS.md) / [ROADMAP.md](./ROADMAP.md) 为准（最近核对：**2026-08-08**）。

## 一、产品定位与能力清单

### 1. 核心定位
> 一期以**源码 + 预览双栏**交付；二期再做**编辑预览一体化 WYSIWYG**。底层始终保存标准 Markdown 源码。
- 用户群体：程序员写文档、技术笔记、博客、学术笔记、日常 Markdown 写作
- 核心理念：沉浸式写作；纯本地文件，不强制云存储

### 2. 功能清单
#### 核心体验
1. **双栏编辑（一期）**
   - 左：源码编辑；右：实时预览
   - 完整源码模式：快捷键一键切换仅源码视图
2. **混合编辑模式（二期）**
   - 正常状态：渲染后的排版；光标进入块内还原 Markdown 源码，移出自动渲染
3. **GFM 完整支持**：标题、粗斜体、删除线、表格、任务列表、引用块、分割线、脚注、YAML Front‑Matter
4. **扩展能力**
   - Mermaid 流程图、时序图、甘特图
   - KaTeX 数学公式（行内 / 块级）
   - 代码块语法高亮（多语言）
5. **界面组件**
   - 侧边栏：文件树、大纲、工作区搜索；文件 Tab 多文档
   - 无可见工具栏：原生菜单 + 轻量 MenuChrome + Typora 风状态栏
   - 大纲 TOC 快速跳转；右键菜单；表格浮动工具条
   - 专注模式 Focus、打字机 Typewriter（二期）
   - 字数统计、行号、搜索替换
6. **文件能力**
   - 直接读写本地 `.md`，拖拽图片，相对路径存储
   - 导出：PDF / HTML（Word / 图片后置）
   - 会话记忆、最近打开、Windows NSIS 安装包
7. **主题系统**
   - 默认 Night；菜单可切换 Github / Newsprint / Night / Pixyll / Whitey
   - CSS 变量驱动；自定义主题文件导入后置

### 3. 产品优势方向
1. Tauri 2：包体积小、启动快、内存占用低（相对 Chromium 壳）
2. 界面极简，干扰少
3. 主题 CSS 变量化，便于扩展
4. 纯本地文件，不锁格式
5. 跨平台 Windows / macOS / Linux，中文排版友好

### 4. Night 主题关键特征
- 主背景：深灰 `#363b40`，侧边栏更深 `#2e3033`，**非纯黑，护眼**
- 正文文本：低饱和灰白 `#b8bfc6`，保证 WCAG 可读性对比度
- 高亮主色：浅蓝 `#a3d5fe`；选中文本蓝色背景
- 代码块暗色配色，适配源码视图、Mermaid 暗色渲染
- 表格、引用块、分割线、列表全部暗色适配；hover、激活文件状态变量完整
- CSS 变量化设计，方便后续扩展其他主题

## 二、技术栈评估 & 关键选型

> 既定栈：Tauri 2.x｜Vue3 + TypeScript + Pinia + Vite｜Element‑Plus（仅按需引入 Message）

### 1. Tauri 2.x
✅ 优势：不用打包 Chromium，安装包体积小，启动快，内存占用低；跨平台；Rust 后端处理文件读写、对话框、窗口管理。
⚠️ 注意点：
- 文件读写：优先 Tauri v2 `fs` API
- 本地图片：asset 协议解决相对路径加载
- 窗口、菜单、快捷键需 Rust 侧配置

### 2. Markdown 编辑器内核选型（关键，二选一）
> Vue 只是 UI 外壳，**解析与编辑内核决定体验**，不要手写解析器。

| 方案 | 库 | 说明 |
|---|---|---|
| 方案 A（一体化 WYSIWYG） | ProseMirror + markdown-it | 编辑预览一体，光标映射复杂；开源项目 MarkLight 等同路线 |
| 方案 B（稳妥起步：先双栏，再迭代一体） | CodeMirror 6 + markdown‑it | 大文档流畅；先做「左源码 + 右预览」，再迭代混合编辑；适合 MVP |

> **✅ 已锁定：MVP = 方案 B（CodeMirror 6 + markdown-it 双栏）；一体化 WYSIWYG = 二期，不进 MVP。**

### 3. 渲染扩展库
- Markdown 解析：`markdown-it` + 插件（GFM、脚注、YAML frontmatter）
- Mermaid：暗色主题适配 Night
- 数学公式：`katex`
- 代码高亮：`shiki`（Night 配色）

### 4. 状态管理 Pinia
- 存储：当前文档、文件树、编辑器配置、窗口状态
- 持久化：`tauri-plugin-store`，不用 localStorage

### 5. UI
- Element‑Plus **只按需导入 Message**；主体、侧边栏、大纲手写，避免样式污染预览
- Night 主题全部 CSS 变量，分离主题与业务代码

## 三、MVP 版本功能规划
> 优先级 P0 必须做，P1 后续迭代。  
> 实现进度以 [PROGRESS.md](./PROGRESS.md) / [ROADMAP.md](./ROADMAP.md) 为准（最近核对：**2026-08-08**）。

### P0（MVP，第一版）— 方案 B 双栏 — **已完成**
1. ✅ Tauri 窗口：打开本地文件夹，文件树浏览 md；多 Tab 打开文档（Ctrl+Tab；外部变更提示）
2. ✅ CodeMirror 6 源码区 + 右侧预览双栏
3. ✅ **Night 暗色主题**（正文 / 源码 / Mermaid 暗色）
4. ✅ 读写本地 md，保存、另存为；关窗/关 Tab 支持「保存 / 不保存 / 取消」；拖拽图片写入 `./assets/`，预览走 asset 协议
5. ✅ GFM 标准支持，YAML front‑matter（脚注、任务列表已接）
6. ✅ Mermaid、KaTeX、Shiki
7. ✅ 源码模式切换（`Ctrl+/`）；查找 / 替换面板（`Ctrl+F` / `Ctrl+H`，含匹配计数）
8. ✅ 基础导出：导出 HTML、PDF（Typst：CJK / 公式 / Mermaid PNG / 脚注；失败可回退系统打印）
9. ✅ 大纲 TOC 面板（侧栏「文件 / 大纲」双 Tab）；Element‑Plus Message 已接
10. ✅ plugin-store：分栏比例、视图模式、侧栏、最近工作区、窗口几何

### P1（二期）— 一体化改造
1. ✅ **混合 WYSIWYG 一体化编辑（Milkdown Crepe · M1/M2）**
2. ✅ Focus 专注模式、打字机模式（M3）
3. ✅ 字数统计（M3）；布局精简（菜单 + 状态栏）；右键 / 表格工具条
4. ✅ 内置主题菜单切换（M4 子集）；⬜ 自定义主题 CSS 导入（后置）
5. ⬜ 图片管理、简单图床（M4 后置）
6. ⬜ 导出 Word、图片（M4 后置）

### P2（差异化）
1. ✅ 标签页会话记忆；最近打开列表
2. ✅ 全局文件夹搜索 md 内容
3. ⬜ Vim 编辑模式

## 四、项目命名
> ✅ 已选：**Lunark（月刻）**

## 五、风险与踩坑提示
1. **WYSIWYG 一体化**：二期已采用 Milkdown Crepe；查找仍依赖源码模式（混合下会提示并切换）。
2. 主题：CSS 变量驱动；勿只改背景。亮色主题下预览 Shiki 仍可能偏暗色（已知债）。
3. Tauri 本地图片：相对路径必须走 asset 协议。
4. 大文档性能：CodeMirror 6 增量渲染，markdown-it 防抖，避免输入时频繁重绘。
5. Windows 打包：当前默认 NSIS；MSI 需 WiX（GitHub 下载可能超时）。改图标后需完整重建/重启 exe。
