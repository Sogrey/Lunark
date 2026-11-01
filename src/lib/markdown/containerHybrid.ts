/**
 * 混合编辑：Crepe 不解析 markdown-it-container，
 * 将 ::: 容器暂存为同名围栏（tip / warning / align-center…），
 * 用 CodeMirror renderPreview 呈现；写回 Tab / 源码时再还原为 :::。
 */
import {
  ALIGN_CONTAINER_KINDS,
  CONTAINER_KINDS,
  isAlignContainer,
  type ContainerKind,
} from "@/lib/markdown/containers";

const KIND_ALT = CONTAINER_KINDS.join("|");
const CONTAINER_OPEN_RE = new RegExp(
  `^::: (${KIND_ALT})(?:[ \\t]+([^\\n]*))?\\r?\\n([\\s\\S]*?)^:::\\s*$`,
  "gm",
);
const CONTAINER_FENCE_RE = new RegExp(
  `^\`\`\`(${KIND_ALT})\\r?\\n([\\s\\S]*?)^\`\`\`\\s*$`,
  "gm",
);

export function isContainerLang(lang: string): lang is ContainerKind {
  return (CONTAINER_KINDS as readonly string[]).includes(lang);
}

/** 从 ::: 或围栏片段解析出 kind + 围栏正文（供插入 code_block） */
export function parseContainerInsert(
  md: string,
): { kind: ContainerKind; body: string } | null {
  let text = md.replace(/\r\n/g, "\n").trim();
  if (text.startsWith(":::")) {
    text = containersToHybridFences(`${text}\n`).trim();
  }
  const m = text.match(
    new RegExp(`^\`\`\`(${KIND_ALT})\\n([\\s\\S]*?)\\n\`\`\`$`),
  );
  if (!m || !isContainerLang(m[1]!)) return null;
  return { kind: m[1], body: m[2] ?? "" };
}

/** 围栏正文 → ::: 方言（预览源码行 / 落盘） */
export function fenceBodyToContainer(
  kind: ContainerKind,
  fenceBody: string,
): string {
  const content = fenceBody.replace(/\r\n/g, "\n").replace(/\n$/, "");
  if (isAlignContainer(kind)) {
    return `::: ${kind}\n${content}\n:::`;
  }
  const nl = content.indexOf("\n");
  if (nl === -1) {
    return `::: ${kind}\n${content}\n:::`;
  }
  const title = content.slice(0, nl).trim();
  const body = content.slice(nl + 1);
  if (!title) {
    return `::: ${kind}\n${body}\n:::`;
  }
  return `::: ${kind} ${title}\n${body}\n:::`;
}

/** 文档内 ::: → 围栏（喂给 Crepe） */
export function containersToHybridFences(md: string): string {
  return md.replace(CONTAINER_OPEN_RE, (_m, kind: string, title: string, body: string) => {
    const k = kind as ContainerKind;
    const bodyText = String(body ?? "").replace(/\r\n/g, "\n").replace(/\n$/, "");
    if ((ALIGN_CONTAINER_KINDS as readonly string[]).includes(k)) {
      return `\`\`\`${k}\n${bodyText}\n\`\`\``;
    }
    const titleLine = String(title ?? "").trim();
    const content = titleLine ? `${titleLine}\n${bodyText}` : bodyText;
    return `\`\`\`${k}\n${content}\n\`\`\``;
  });
}

/** 围栏 → :::（写回 Tab / 源码） */
export function hybridFencesToContainers(md: string): string {
  return md.replace(CONTAINER_FENCE_RE, (_m, kind: string, raw: string) => {
    return fenceBodyToContainer(kind as ContainerKind, String(raw ?? ""));
  });
}
