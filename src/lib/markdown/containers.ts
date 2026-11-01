import MarkdownIt from "markdown-it";
import markdownItContainer from "markdown-it-container";
import { t } from "@/lib/i18n";

type MarkdownItInstance = InstanceType<typeof MarkdownIt>;

/** tip 族（可带标题） */
export const TIP_CONTAINER_KINDS = [
  "tip",
  "info",
  "warning",
  "danger",
  "details",
] as const;

/** 对齐容器（方言；无标题栏） */
export const ALIGN_CONTAINER_KINDS = [
  "align-left",
  "align-center",
  "align-right",
] as const;

/** Lunark 可选扩展容器 */
export const CONTAINER_KINDS = [
  ...TIP_CONTAINER_KINDS,
  ...ALIGN_CONTAINER_KINDS,
] as const;

export type TipContainerKind = (typeof TIP_CONTAINER_KINDS)[number];
export type AlignContainerKind = (typeof ALIGN_CONTAINER_KINDS)[number];
export type ContainerKind = (typeof CONTAINER_KINDS)[number];

export function isAlignContainer(kind: ContainerKind): kind is AlignContainerKind {
  return (ALIGN_CONTAINER_KINDS as readonly string[]).includes(kind);
}

export function isContainerKind(s: string): s is ContainerKind {
  return (CONTAINER_KINDS as readonly string[]).includes(s);
}

function defaultTitle(kind: TipContainerKind): string {
  switch (kind) {
    case "tip":
      return t("editor.containerTip");
    case "info":
      return t("editor.containerInfo");
    case "warning":
      return t("editor.containerWarning");
    case "danger":
      return t("editor.containerDanger");
    case "details":
      return t("editor.containerDetails");
  }
}

/** 插入光标处的容器片段；正文占位便于改写 */
export function containerSnippet(kind: ContainerKind): string {
  const body = t("editor.containerBody");
  if (isAlignContainer(kind)) {
    return `::: ${kind}\n${body}\n:::\n`;
  }
  const title = defaultTitle(kind);
  if (kind === "details") {
    return `::: details ${title}\n${body}\n:::\n`;
  }
  return `::: ${kind} ${title}\n${body}\n:::\n`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nlToBr(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br>\n");
}

/**
 * 混合编辑围栏预览 HTML（与 markdown-it-container 视觉对齐）。
 * tip 族：首行标题、其余正文；对齐：整段正文。
 */
export function renderContainerPreviewHtml(
  kind: ContainerKind,
  fenceBody: string,
): string {
  const body = fenceBody.replace(/\r\n/g, "\n");
  if (isAlignContainer(kind)) {
    return `<div class="lunark-align lunark-${kind}">${nlToBr(body.trim())}</div>`;
  }
  const tip = kind as TipContainerKind;
  const lines = body.split("\n");
  let title = defaultTitle(tip);
  let content = body;
  if (lines.length > 1) {
    const head = lines[0]!.trim();
    if (head) title = head;
    content = lines.slice(1).join("\n");
  }
  const inner = nlToBr(content.trim());
  if (kind === "details") {
    return `<details class="lunark-container lunark-container-details" open><summary>${escapeHtml(title)}</summary><p>${inner}</p></details>`;
  }
  return `<div class="lunark-container lunark-container-${kind}"><p class="lunark-container-title">${escapeHtml(title)}</p><p>${inner}</p></div>`;
}

function registerTipContainer(
  md: MarkdownItInstance,
  kind: TipContainerKind,
): void {
  const marker = kind === "details" ? "details" : kind;
  md.use(markdownItContainer, marker, {
    validate(params: string) {
      return new RegExp(`^${marker}\\s*(.*)$`).test(params.trim());
    },
    render(
      tokens: { info: string; nesting: number }[],
      idx: number,
    ) {
      const token = tokens[idx]!;
      const m = token.info.trim().match(new RegExp(`^${marker}\\s*(.*)$`));
      const custom = (m?.[1] ?? "").trim();
      const title = custom || defaultTitle(kind);

      if (token.nesting === 1) {
        if (kind === "details") {
          return `<details class="lunark-container lunark-container-details"><summary>${escapeHtml(title)}</summary>\n`;
        }
        return `<div class="lunark-container lunark-container-${kind}"><p class="lunark-container-title">${escapeHtml(title)}</p>\n`;
      }
      return kind === "details" ? "</details>\n" : "</div>\n";
    },
  });
}

function registerAlignContainer(
  md: MarkdownItInstance,
  kind: AlignContainerKind,
): void {
  md.use(markdownItContainer, kind, {
    validate(params: string) {
      return new RegExp(`^${kind}\\s*$`).test(params.trim());
    },
    render(tokens: { nesting: number }[], idx: number) {
      const token = tokens[idx]!;
      if (token.nesting === 1) {
        return `<div class="lunark-align lunark-${kind}">\n`;
      }
      return "</div>\n";
    },
  });
}

export function useMarkdownContainers(md: MarkdownItInstance): void {
  for (const kind of TIP_CONTAINER_KINDS) {
    registerTipContainer(md, kind);
  }
  for (const kind of ALIGN_CONTAINER_KINDS) {
    registerAlignContainer(md, kind);
  }
}
