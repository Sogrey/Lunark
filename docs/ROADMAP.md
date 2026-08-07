# Lunark MVP 路线图（方案 B）

> 决策锁定：MVP = CodeMirror6 双栏 + markdown-it；**一体化 WYSIWYG 放二期。**  
> 进度明细见 [PROGRESS.md](./PROGRESS.md)。最近核对：**2026-08-07（一期收口）**。

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

## 二期（进行中）— 对标 Typora

见 [PHASE2-WYSIWYG.md](./PHASE2-WYSIWYG.md)。

| 里程碑 | 状态 |
|---|---|
| M1 Crepe 混合壳 + 三模式 | 完成 |
| M2 扩展语法对齐（KaTeX/代码/Mermaid/图片） | 完成 |
| M3 Focus / 打字机 / 字数 | 完成 |
| M4 主题 / Word / 图床（后置） | 未开始 |

## 三期（进行中）

| 里程碑 | 状态 |
|---|---|
| 标签页会话记忆 + 最近打开 | 完成 |
| 全局文件夹搜索 | 完成 |
| Vim 模式 | 未开始 |
