# Lunark MVP 路线图（方案 B）

> 决策锁定：MVP = CodeMirror6 双栏 + markdown-it；**一体化 WYSIWYG 放二期。**  
> 进度明细见 [PROGRESS.md](./PROGRESS.md)。最近核对：**2026-08-09**。

## 一期（MVP / P0）— **完成**

| # | 模块 | 状态 | 说明 |
|---|---|---|---|
| 0 | 工程基建 | ✅ | Tauri 2 + Vue3 + pnpm |
| 1 | 双栏壳 CM6 / 预览 | ✅ | 含滚动联动开关 |
| 2 | Night 主题 | ✅ | 含 Mermaid 暗色变量 |
| 3 | GFM + 脚注 + 任务 + FM | ✅ | 含 strikethrough |
| 4 | 打开/保存本地 md | ✅ | 保存·不保存·取消 |
| 5 | 文件夹树 + 多 Tab | ✅ | Ctrl+Tab；外部变更提示 |
| 6 | 大纲 TOC | ✅ | 侧栏文件/大纲双 Tab |
| 7 | 本地图片 asset | ✅ | 拖图/粘贴插光标 |
| 8 | Mermaid / KaTeX / Shiki | ✅ | |
| 9 | 导出 HTML / PDF | ✅ | Typst：CJK / 公式 / Mermaid PNG / 脚注 / 嵌套列表 |
| 10 | 搜索替换 + Message | ✅ | 匹配计数 + 全部替换确认 |
| 11 | plugin-store 持久化 | ✅ | 分栏 / 侧栏 / 最近工作区 / 窗口几何 |
| 12 | 拖图/粘贴 + 联动开关 | ✅ | |
| 13 | 关窗 / 菜单 / 链接 / Tab 状态 | ✅ | destroy 权限；菜单含导出与替换 |

## 一期收尾

MVP 功能与打磨项已齐。

## 二期（核心完成）— 对标 Typora

见 [PHASE2-WYSIWYG.md](./PHASE2-WYSIWYG.md)。

| 里程碑 | 状态 |
|---|---|
| M1 Crepe 混合壳 + 三模式 | ✅ |
| M2 扩展语法对齐（KaTeX/代码/Mermaid/图片） | ✅ |
| M3 Focus / 打字机 / 字数 | ✅ |
| 布局精简（菜单 + 状态栏，无工具栏） | ✅ |
| 右键菜单 / 表格浮动条 | ✅ |
| M4 内置主题 + 自定义 CSS 导入 | ✅ |
| M4 Word（.doc）/ 图片（.png）导出 | ✅ |
| 打磨：表格匹配 / Shiki 主题 / 帮助 / prefs | ✅ |
| Typora 风局部语法糖（hybrid 源码露出） | ✅ |
| 工程整理（hybrid 拆分 / 导出编排 / 依赖瘦身） | ✅ |
| **混合源码条 UX 收尾（08-09）** | ✅ | 源码条删除 / 实时预览 / 清空删块 / Mermaid applyPreview |
| M4 图床 | ⏸ 预留（暂不排期；见 PROGRESS） |

### 混合源码条收尾（摘要）

- 图片 / 行内·块级公式 / Mermaid：选中后上方 Markdown 源码条，**右侧垃圾桶删除**
- 改源码 → 下方渲染防抖实时刷新；清空失焦/Enter → 整块删除（修 `$$$$`）
- Mermaid：Crepe `applyPreview` + 串行 `renderMermaidSvg`（修「一直渲染中」）

## 三期 — **功能项完成（预留除外）**

| 里程碑 | 状态 |
|---|---|
| 标签页会话记忆 + 最近打开 | ✅ |
| 全局文件夹搜索 | ✅ |
| i18n（简中/繁中/英/韩/日） | ✅（菜单 + 壳层 + 编辑器/Toast） |
| Vim 模式 | ⏸ 预留（暂不排期） |
| Crepe 切 Tab / 大文档性能 | ⏸ 预留（实测卡顿再做） |

## 分发

| 项 | 状态 |
|---|---|
| 应用图标（月刻） | ✅ |
| Windows NSIS（本机 / CI） | ✅ |
| macOS DMG / Linux AppImage+deb（CI） | ✅ 见 `.github/workflows/release.yml`（**暂不签名**） |
| P0 QA-SMOKE | ✅ 已验一轮（2026-08-09） |
| 内测分发 | 🔄 **持续进行**（收集反馈驱动小修） |
| 代码签名 / Apple 公证 | ⏸ 暂不做 |

### 多平台 Release（CI）

- **触发**：推送 `v*` tag，或 Actions → `release` → Run workflow  
- **产物**：Windows NSIS、macOS DMG（Arm + Intel）、Linux AppImage + deb → **GitHub Release** + run Artifacts  
- **注意**：仓库 Settings → Actions → Workflow permissions 需允许 **Read and write**  
- 本机 Windows 仍可 `pnpm tauri:build` 只打 NSIS；mac/Linux 包从 CI Release 下载  

## 建议下一步

1. **持续**：推 `v*` 或手动跑 CI，用 Release 做多平台内测  
2. **按需**：反馈驱动的小修复 / 打磨（不新开大功能）  
3. **预留暂不排期**：Vim / Crepe 切 Tab / 图床；签名 / 公证待正式对外再开  
4. 预留功能见 [PROGRESS.md](./PROGRESS.md)「预留 / 已知债」
