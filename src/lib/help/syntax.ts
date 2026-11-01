/**
 * 扩展语法帮助条目（示例源码固定；标题/说明走 i18n）。
 * 桌面端：帮助 → 扩展语法…
 */

export interface SyntaxHelpRow {
  id: string;
  /** help.sx* */
  titleKey: string;
  sample: string;
  /** 可选说明；方言会标 note */
  noteKey?: string;
  /** 非标准 Markdown 方言 */
  dialect?: boolean;
}

export const SYNTAX_HELP_ROWS: readonly SyntaxHelpRow[] = [
  {
    id: "containers",
    titleKey: "help.sxContainers",
    dialect: true,
    noteKey: "help.sxContainersNote",
    sample: `::: tip 标题
内容
:::

::: warning
注意
:::

::: details 折叠
隐藏内容
:::`,
  },
  {
    id: "image-size",
    titleKey: "help.sxImageSize",
    dialect: true,
    noteKey: "help.sxImageSizeNote",
    sample: `![图](./assets/a.png =400x)

![图](./assets/a.png =400x300)

![图](./assets/a.png){width=50%}`,
  },
  {
    id: "highlight-lines",
    titleKey: "help.sxHighlightLines",
    dialect: true,
    noteKey: "help.sxHighlightLinesNote",
    sample: "```ts{1,3-5}\nconst a = 1;\nconst b = 2;\nconst c = 3;\n```",
  },
  {
    id: "katex",
    titleKey: "help.sxKatex",
    sample: `行内 $E=mc^2$

$$
\\int_0^1 x^2\\,dx
$$`,
  },
  {
    id: "mermaid",
    titleKey: "help.sxMermaid",
    sample: "```mermaid\nflowchart LR\n  A --> B\n```",
  },
  {
    id: "align",
    titleKey: "help.sxAlign",
    dialect: true,
    noteKey: "help.sxAlignNote",
    sample: `::: align-center
居中内容
:::`,
  },
  {
    id: "anchor",
    titleKey: "help.sxAnchor",
    dialect: true,
    noteKey: "help.sxAnchorNote",
    sample: `## 章节标题 {#custom-id}`,
  },
  {
    id: "wiki",
    titleKey: "help.sxWiki",
    dialect: true,
    noteKey: "help.sxWikiNote",
    sample: `[[笔记名]]

[[笔记名|显示文本]]`,
  },
  {
    id: "emoji",
    titleKey: "help.sxEmoji",
    noteKey: "help.sxEmojiNote",
    sample: `命令面板搜索 emoji / 笑 / fire …`,
  },
  {
    id: "gfm",
    titleKey: "help.sxGfm",
    noteKey: "help.sxGfmNote",
    sample: `- [x] 已完成
- [ ] 待办

脚注[^1]

[^1]: 脚注正文`,
  },
];
