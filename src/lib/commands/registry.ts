import { getFormatBridge } from "@/lib/editor/formatBridge";
import type { CrepeBlockAction } from "@/lib/editor/crepeCommands";
import { EMOJI_CATALOG } from "@/lib/editor/emojiCatalog";
import { containerSnippet, type ContainerKind } from "@/lib/markdown/containers";
import { t } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { refreshAppMenu } from "@/lib/appMenu";

export type CommandCategory = "format" | "insert" | "view" | "nav";

export interface CommandItem {
  id: string;
  category: CommandCategory;
  /** 已本地化标题（打开面板时生成） */
  label: string;
  /** 搜索用额外词（中英混排） */
  keywords: string;
  run: () => void;
}

function withBridge(fn: (b: NonNullable<ReturnType<typeof getFormatBridge>>) => void) {
  return () => {
    const b = getFormatBridge();
    if (!b) return;
    b.focus();
    fn(b);
  };
}

function insertContainer(kind: ContainerKind) {
  return withBridge((b) => b.insertSnippet(containerSnippet(kind)));
}

/** 构建当前语言下的命令表（每次打开面板调用，保证 i18n 新鲜） */
export function buildCommands(): CommandItem[] {
  const editor = useEditorStore();
  const workspace = useWorkspaceStore();

  const items: CommandItem[] = [
    // —— 格式 ——
    {
      id: "format.strong",
      category: "format",
      label: t("editor.bold"),
      keywords: "bold strong 粗体",
      run: withBridge((b) => b.toggleMark("strong")),
    },
    {
      id: "format.emphasis",
      category: "format",
      label: t("editor.italic"),
      keywords: "italic emphasis 斜体",
      run: withBridge((b) => b.toggleMark("emphasis")),
    },
    {
      id: "format.inlineCode",
      category: "format",
      label: t("editor.inlineCode"),
      keywords: "code inline 行内代码",
      run: withBridge((b) => b.toggleMark("inlineCode")),
    },
    {
      id: "format.link",
      category: "format",
      label: t("editor.link"),
      keywords: "link url 链接",
      run: withBridge((b) => b.toggleMark("link")),
    },
    {
      id: "format.quote",
      category: "format",
      label: t("editor.quote"),
      keywords: "quote blockquote 引用",
      run: withBridge((b) => b.runBlockAction("quote")),
    },
    {
      id: "format.bulletList",
      category: "format",
      label: t("editor.bulletList"),
      keywords: "ul bullet list 无序",
      run: withBridge((b) => b.runBlockAction("bulletList")),
    },
    {
      id: "format.orderedList",
      category: "format",
      label: t("editor.orderedList"),
      keywords: "ol ordered list 有序",
      run: withBridge((b) => b.runBlockAction("orderedList")),
    },
    {
      id: "format.taskList",
      category: "format",
      label: t("editor.taskList"),
      keywords: "task todo checkbox 任务",
      run: withBridge((b) => b.runBlockAction("taskList")),
    },
    {
      id: "format.paragraph",
      category: "format",
      label: t("editor.paragraph"),
      keywords: "paragraph 段落",
      run: withBridge((b) => b.runBlockAction("paragraph")),
    },
    ...([1, 2, 3, 4, 5, 6] as const).map((n) => {
      const action = `h${n}` as CrepeBlockAction;
      return {
        id: `format.h${n}`,
        category: "format" as const,
        label: t("editor.headingLevel", { n }),
        keywords: `h${n} heading 标题`,
        run: withBridge((b) => b.runBlockAction(action)),
      };
    }),

    // —— 插入 ——
    {
      id: "insert.image",
      category: "insert",
      label: t("editor.image"),
      keywords: "image 图片 图像 图床",
      run: () => {
        void import("@/lib/editor/pickInsertImages").then((m) =>
          m.pickAndInsertImages(),
        );
      },
    },
    {
      id: "insert.table",
      category: "insert",
      label: t("editor.table"),
      keywords: "table 表格",
      run: withBridge((b) => b.runBlockAction("table")),
    },
    {
      id: "insert.codeBlock",
      category: "insert",
      label: t("editor.codeBlock"),
      keywords: "code fence 代码块",
      run: withBridge((b) => b.runBlockAction("codeBlock")),
    },
    {
      id: "insert.math",
      category: "insert",
      label: t("editor.mathBlock"),
      keywords: "math latex katex 公式",
      run: withBridge((b) => b.runBlockAction("math")),
    },
    {
      id: "insert.hr",
      category: "insert",
      label: t("editor.hr"),
      keywords: "hr horizontal rule 分割线",
      run: withBridge((b) => b.runBlockAction("hr")),
    },
    {
      id: "insert.footnote",
      category: "insert",
      label: t("editor.footnote"),
      keywords: "footnote 脚注",
      run: () => {
        void import("@/lib/editor/insertFootnote").then((m) =>
          m.insertFootnote(),
        );
      },
    },
    {
      id: "insert.toc",
      category: "insert",
      label: t("editor.toc"),
      keywords: "toc outline 目录",
      run: withBridge((b) => b.insertSnippet("[TOC]")),
    },
    {
      id: "insert.yaml",
      category: "insert",
      label: t("editor.yamlFm"),
      keywords: "yaml front matter",
      run: withBridge((b) => b.insertSnippet("---\ntitle: \n---\n")),
    },
    {
      id: "insert.tip",
      category: "insert",
      label: t("editor.containerTip"),
      keywords: "tip callout 提示块",
      run: insertContainer("tip"),
    },
    {
      id: "insert.info",
      category: "insert",
      label: t("editor.containerInfo"),
      keywords: "info callout 说明",
      run: insertContainer("info"),
    },
    {
      id: "insert.warning",
      category: "insert",
      label: t("editor.containerWarning"),
      keywords: "warning callout 警告",
      run: insertContainer("warning"),
    },
    {
      id: "insert.danger",
      category: "insert",
      label: t("editor.containerDanger"),
      keywords: "danger callout 危险",
      run: insertContainer("danger"),
    },
    {
      id: "insert.details",
      category: "insert",
      label: t("editor.containerDetails"),
      keywords: "details callout 详情 折叠",
      run: insertContainer("details"),
    },
    {
      id: "insert.alignLeft",
      category: "insert",
      label: t("editor.alignLeft"),
      keywords: "align left 左对齐",
      run: insertContainer("align-left"),
    },
    {
      id: "insert.alignCenter",
      category: "insert",
      label: t("editor.alignCenter"),
      keywords: "align center 居中",
      run: insertContainer("align-center"),
    },
    {
      id: "insert.alignRight",
      category: "insert",
      label: t("editor.alignRight"),
      keywords: "align right 右对齐",
      run: insertContainer("align-right"),
    },
    ...EMOJI_CATALOG.map((e) => ({
      id: `insert.emoji.${e.id}`,
      category: "insert" as const,
      label: `${e.char} ${e.label}`,
      keywords: `emoji ${e.char} ${e.label} ${e.keywords}`,
      run: withBridge((b) => b.insertSnippet(e.char)),
    })),

    // —— 视图 ——
    {
      id: "view.toggleMode",
      category: "view",
      label: t("menu.toggleMode"),
      keywords: "mode hybrid source split 模式",
      run: () => {
        editor.toggleViewMode();
        void refreshAppMenu();
      },
    },
    {
      id: "view.hybrid",
      category: "view",
      label: t("menu.modeHybrid"),
      keywords: "hybrid wysiwyg 混合",
      run: () => {
        editor.setViewMode("hybrid");
        void refreshAppMenu();
      },
    },
    {
      id: "view.source",
      category: "view",
      label: t("menu.modeSource"),
      keywords: "source 源码",
      run: () => {
        editor.setViewMode("source");
        void refreshAppMenu();
      },
    },
    {
      id: "view.split",
      category: "view",
      label: t("menu.modeSplit"),
      keywords: "split preview 双栏",
      run: () => {
        editor.setViewMode("split");
        void refreshAppMenu();
      },
    },
    {
      id: "view.sidebar",
      category: "view",
      label: t("menu.sidebar"),
      keywords: "sidebar 侧栏",
      run: () => {
        window.dispatchEvent(new CustomEvent("lunark:menu-toggle-sidebar"));
      },
    },
    {
      id: "view.focus",
      category: "view",
      label: t("menu.focusMode"),
      keywords: "focus 专注",
      run: () => {
        editor.toggleFocusMode();
        void refreshAppMenu();
      },
    },
    {
      id: "view.typewriter",
      category: "view",
      label: t("menu.typewriterMode"),
      keywords: "typewriter 打字机",
      run: () => {
        editor.toggleTypewriterMode();
        void refreshAppMenu();
      },
    },
    {
      id: "view.fullscreen",
      category: "view",
      label: t("menu.fullscreen"),
      keywords: "fullscreen 全屏 F11",
      run: () => {
        window.dispatchEvent(new CustomEvent("lunark:menu-toggle-fullscreen"));
      },
    },
    {
      id: "view.statusBar",
      category: "view",
      label: t("menu.statusBar"),
      keywords: "statusbar 状态栏",
      run: () => {
        editor.toggleStatusBar();
        void refreshAppMenu();
      },
    },
    {
      id: "view.codeLineNumbers",
      category: "view",
      label: t("menu.codeLineNumbers"),
      keywords: "line numbers 行号",
      run: () => {
        editor.toggleCodeLineNumbers();
        void refreshAppMenu();
      },
    },

    // —— 导航 ——
    {
      id: "nav.find",
      category: "nav",
      label: t("menu.find"),
      keywords: "find search 查找",
      run: () => editor.openSearch({ replace: false }),
    },
    {
      id: "nav.replace",
      category: "nav",
      label: t("menu.replace"),
      keywords: "replace 替换",
      run: () => editor.openSearch({ replace: true }),
    },
    {
      id: "nav.findWorkspace",
      category: "nav",
      label: t("menu.findWorkspace"),
      keywords: "workspace search 工作区搜索",
      run: () => {
        if (editor.focusMode) editor.setFocusMode(false);
        workspace.setSidebarPanel("search");
      },
    },
    {
      id: "nav.outline",
      category: "nav",
      label: t("shell.outline"),
      keywords: "outline toc 大纲",
      run: () => {
        if (editor.focusMode) editor.setFocusMode(false);
        workspace.setSidebarPanel("outline");
      },
    },
    {
      id: "nav.files",
      category: "nav",
      label: t("shell.files"),
      keywords: "files tree 文件",
      run: () => {
        if (editor.focusMode) editor.setFocusMode(false);
        workspace.setSidebarPanel("files");
      },
    },
    {
      id: "nav.syntaxHelp",
      category: "nav",
      label: t("menu.syntaxHelp"),
      keywords: "syntax help tip katex mermaid 语法 帮助",
      run: () => {
        window.dispatchEvent(
          new CustomEvent("lunark:help", { detail: "syntax" }),
        );
      },
    },
  ];

  return items;
}

export function categoryLabel(cat: CommandCategory): string {
  switch (cat) {
    case "format":
      return t("cmd.catFormat");
    case "insert":
      return t("cmd.catInsert");
    case "view":
      return t("cmd.catView");
    case "nav":
      return t("cmd.catNav");
  }
}
