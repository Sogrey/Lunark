import { $inputRule, $prose } from "@milkdown/kit/utils";
import { InputRule } from "@milkdown/kit/prose/inputrules";
import type { MarkType, NodeType } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@milkdown/kit/prose/state";
import { linkSchema } from "@milkdown/kit/preset/commonmark";
import { imageBlockSchema } from "@milkdown/kit/component/image-block";

const autoConvertKey = new PluginKey("lunark-md-auto-convert");

/**
 * 手写 `[text](url)` / `![alt](url)` 在完成（或后跟空格）时转为结构化节点，
 * 离开后即可走阅读态渲染；源码露出由 hybridSourceMarks 负责。
 */

function parseLinkMatch(match: RegExpMatchArray): {
  text: string;
  href: string;
  title: string;
} | null {
  const text = match[1] ?? "";
  const href = (match[2] ?? "").trim();
  if (!href) return null;
  return { text, href, title: match[3] ?? "" };
}

/** 闭合 `)` 时转换链接 */
export const lunarkLinkInputOnClose = $inputRule((ctx) => {
  const type = linkSchema.type(ctx);
  return new InputRule(
    /\[([^\]]+)\]\(\s*<?([^\s)>]+)>?(?:\s+"([^"]*)")?\s*\)$/,
    (state, match, start, end) => {
      const parsed = parseLinkMatch(match);
      if (!parsed) return null;
      const mark = type.create({
        href: parsed.href,
        title: parsed.title || null,
      });
      const textNode = state.schema.text(parsed.text, [mark]);
      return state.tr.replaceWith(start, end, textNode);
    },
  );
});

/** `)` 后输入空格时转换（兼容已写完整语法再敲空格） */
export const lunarkLinkInputOnSpace = $inputRule((ctx) => {
  const type = linkSchema.type(ctx);
  return new InputRule(
    /\[([^\]]+)\]\(\s*<?([^\s)>]+)>?(?:\s+"([^"]*)")?\s*\) $/,
    (state, match, start, end) => {
      const parsed = parseLinkMatch(match);
      if (!parsed) return null;
      const mark = type.create({
        href: parsed.href,
        title: parsed.title || null,
      });
      const textNode = state.schema.text(parsed.text, [mark]);
      return state.tr
        .replaceWith(start, end, textNode)
        .insertText(" ", start + parsed.text.length);
    },
  );
});

function parseImageMatch(match: RegExpMatchArray): {
  alt: string;
  src: string;
  title: string;
} | null {
  const alt = match[1] ?? "";
  const src = (match[2] ?? "").trim();
  if (!src) return null;
  return { alt, src, title: match[3] ?? "" };
}

/** 闭合 `)` 时转换图片块 */
export const lunarkImageInputOnClose = $inputRule((ctx) => {
  const type = imageBlockSchema.type(ctx);
  return new InputRule(
    /!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+"([^"]*)")?\s*\)$/,
    (state, match, start, end) => {
      const parsed = parseImageMatch(match);
      if (!parsed) return null;
      const node = type.create({
        src: parsed.src,
        caption: parsed.title || parsed.alt,
        ratio: 1,
      });
      return state.tr.replaceWith(start, end, node);
    },
  );
});

/** `)` 后空格转换图片 */
export const lunarkImageInputOnSpace = $inputRule((ctx) => {
  const type = imageBlockSchema.type(ctx);
  return new InputRule(
    /!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+"([^"]*)")?\s*\) $/,
    (state, match, start, end) => {
      const parsed = parseImageMatch(match);
      if (!parsed) return null;
      const node = type.create({
        src: parsed.src,
        caption: parsed.title || parsed.alt,
        ratio: 1,
      });
      return state.tr.replaceWith(start, end, node);
    },
  );
});

/**
 * 光标离开文本块时，把残留的纯文本 `[text](url)` / `![alt](url)` 转成结构化节点。
 * （输入规则未触发时的兜底，例如粘贴或中途点走）
 */
function convertPlainMarkdownInTextblock(
  state: EditorState,
  blockPos: number,
  linkType: MarkType,
  imageType: NodeType,
  /** 光标仍在该语法内时跳过，避免输入半截被打断 */
  skipRangeContaining?: number,
): Transaction | null {
  const block = state.doc.nodeAt(blockPos);
  if (!block?.isTextblock || block.type.spec.code) return null;

  const text = block.textContent;
  if (!text.includes("](")) return null;

  type Hit = {
    from: number;
    to: number;
    kind: "image" | "link";
    altOrText: string;
    href: string;
    title: string;
  };
  const hits: Hit[] = [];
  const re =
    /!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+"([^"]*)")?\s*\)|\[([^\]]+)\]\(\s*<?([^\s)>]+)>?(?:\s+"([^"]*)")?\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const isImage = m[0].startsWith("![");
    hits.push({
      from: blockPos + 1 + m.index,
      to: blockPos + 1 + m.index + m[0].length,
      kind: isImage ? "image" : "link",
      altOrText: isImage ? (m[1] ?? "") : (m[4] ?? ""),
      href: ((isImage ? m[2] : m[5]) ?? "").trim(),
      title: (isImage ? m[3] : m[6]) ?? "",
    });
  }
  if (hits.length === 0) return null;

  let tr: Transaction | null = null;
  const base = () => tr ?? state.tr;
  // 多次 replace 后映射坐标：从后往前处理
  const mappedDoc = () => (tr ? tr.doc : state.doc);

  for (const hit of hits.slice().reverse()) {
    if (!hit.href) continue;
    if (
      skipRangeContaining != null &&
      skipRangeContaining >= hit.from &&
      skipRangeContaining <= hit.to
    ) {
      continue;
    }

    const from = tr ? tr.mapping.map(hit.from) : hit.from;
    const to = tr ? tr.mapping.map(hit.to) : hit.to;
    if (from >= to) continue;

    let alreadyLinked = false;
    mappedDoc().nodesBetween(from, to, (node) => {
      if (node.isText && linkType.isInSet(node.marks)) alreadyLinked = true;
    });
    if (alreadyLinked) continue;

    if (hit.kind === "image") {
      const node = imageType.create({
        src: hit.href,
        caption: hit.title || hit.altOrText,
        ratio: 1,
      });
      tr = base().replaceWith(from, to, node);
    } else {
      const mark = linkType.create({
        href: hit.href,
        title: hit.title || null,
      });
      const textNode = state.schema.text(hit.altOrText, [mark]);
      tr = base().replaceWith(from, to, textNode);
    }
  }
  return tr;
}

export const lunarkMarkdownAutoConvert = $prose((ctx) => {
  const linkType = linkSchema.type(ctx);
  const imageType = imageBlockSchema.type(ctx);
  return new Plugin({
    key: autoConvertKey,
    appendTransaction(transactions, oldState, newState) {
      if (!transactions.some((t) => t.selectionSet || t.docChanged))
        return null;
      if (transactions.some((t) => t.getMeta(autoConvertKey))) return null;
      if (
        oldState.selection.eq(newState.selection) &&
        !transactions.some((t) => t.docChanged)
      ) {
        return null;
      }

      const $old = oldState.selection.$from;
      if (!$old.parent.isTextblock) return null;

      // 光标仍压在某段纯文本语法上时跳过该段，避免半截输入被转换
      const skipAt = newState.selection.empty
        ? newState.selection.from
        : undefined;

      const tr = convertPlainMarkdownInTextblock(
        newState,
        $old.before($old.depth),
        linkType,
        imageType,
        skipAt,
      );
      if (!tr) return null;
      tr.setMeta(autoConvertKey, true);
      return tr;
    },
  });
});

export function lunarkHybridMarkdownInput() {
  return [
    lunarkImageInputOnClose,
    lunarkImageInputOnSpace,
    lunarkLinkInputOnClose,
    lunarkLinkInputOnSpace,
    lunarkMarkdownAutoConvert,
  ];
}
