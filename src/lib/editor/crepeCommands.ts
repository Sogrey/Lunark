import type { Crepe } from "@milkdown/crepe";
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core";
import { imageBlockSchema } from "@milkdown/kit/component/image-block";
import {
  addBlockTypeCommand,
  blockquoteSchema,
  bulletListSchema,
  clearTextInCurrentBlockCommand,
  codeBlockSchema,
  headingSchema,
  hrSchema,
  listItemSchema,
  orderedListSchema,
  paragraphSchema,
  selectTextNearPosCommand,
  setBlockTypeCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleLinkCommand,
  toggleStrongCommand,
  wrapInBlockTypeCommand,
} from "@milkdown/kit/preset/commonmark";
import { createTable } from "@milkdown/kit/preset/gfm";

/** 与 Crepe 行首「+」菜单同源的块级动作 */
export type CrepeBlockAction =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "quote"
  | "hr"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "image"
  | "codeBlock"
  | "table"
  | "math";

export type CrepeMarkAction = "strong" | "emphasis" | "inlineCode" | "link";

/**
 * 执行与「+」菜单相同的块命令。
 * @param clearFirst 为 true 时先 clearText（与 + 一致）；右键转换块时建议 false，避免清空正文。
 */
export function runCrepeBlockAction(
  crepe: Crepe,
  action: CrepeBlockAction,
  opts?: { clearFirst?: boolean },
): void {
  const clearFirst = opts?.clearFirst === true;
  try {
    crepe.editor.action((ctx) => {
      const commands = ctx.get(commandsCtx);
      if (clearFirst) {
        commands.call(clearTextInCurrentBlockCommand.key);
      }

      switch (action) {
        case "paragraph":
          commands.call(setBlockTypeCommand.key, {
            nodeType: paragraphSchema.type(ctx),
          });
          break;
        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6": {
          const level = Number(action.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6;
          commands.call(setBlockTypeCommand.key, {
            nodeType: headingSchema.type(ctx),
            attrs: { level },
          });
          break;
        }
        case "quote":
          commands.call(wrapInBlockTypeCommand.key, {
            nodeType: blockquoteSchema.type(ctx),
          });
          break;
        case "hr":
          commands.call(addBlockTypeCommand.key, {
            nodeType: hrSchema.type(ctx),
          });
          break;
        case "bulletList":
          commands.call(wrapInBlockTypeCommand.key, {
            nodeType: bulletListSchema.type(ctx),
          });
          break;
        case "orderedList":
          commands.call(wrapInBlockTypeCommand.key, {
            nodeType: orderedListSchema.type(ctx),
          });
          break;
        case "taskList":
          commands.call(wrapInBlockTypeCommand.key, {
            nodeType: listItemSchema.type(ctx),
            attrs: { checked: false },
          });
          break;
        case "image":
          commands.call(addBlockTypeCommand.key, {
            nodeType: imageBlockSchema.type(ctx),
          });
          break;
        case "codeBlock":
          commands.call(setBlockTypeCommand.key, {
            nodeType: codeBlockSchema.type(ctx),
          });
          break;
        case "table": {
          const view = ctx.get(editorViewCtx);
          const { from } = view.state.selection;
          commands.call(addBlockTypeCommand.key, {
            nodeType: createTable(ctx, 3, 3),
          });
          commands.call(selectTextNearPosCommand.key, { pos: from });
          break;
        }
        case "math":
          commands.call(addBlockTypeCommand.key, {
            nodeType: codeBlockSchema.type(ctx),
            attrs: { language: "LaTeX" },
          });
          break;
        default:
          break;
      }
    });
  } catch (e) {
    console.warn("[lunark] crepe block action failed", action, e);
  }
}

/**
 * 插入带语言与正文的代码块（提示块 / Mermaid 等预览块）。
 * 必须一次创建完整 Node：先空块再 insertText 会把正文插到块外。
 * addBlockTypeCommand 支持传入已建好的 Node（见 milkdown replaceSelectionWith）。
 */
export function insertCrepeCodeBlock(
  crepe: Crepe,
  language: string,
  content: string,
): void {
  try {
    crepe.editor.action((ctx) => {
      const commands = ctx.get(commandsCtx);
      const view = ctx.get(editorViewCtx);
      const type = codeBlockSchema.type(ctx);
      const textNode =
        content.length > 0 ? view.state.schema.text(content) : null;
      const node = textNode
        ? type.create({ language }, textNode)
        : type.createAndFill({ language });
      if (!node) return;
      commands.call(addBlockTypeCommand.key, {
        nodeType: node,
      });
      view.focus();
    });
  } catch (e) {
    console.warn("[lunark] insert code block failed", language, e);
  }
}

/** 与 Crepe 选区工具条同源的标记切换 */
export function runCrepeMarkAction(crepe: Crepe, action: CrepeMarkAction): void {
  try {
    crepe.editor.action((ctx) => {
      const commands = ctx.get(commandsCtx);
      switch (action) {
        case "strong":
          commands.call(toggleStrongCommand.key);
          break;
        case "emphasis":
          commands.call(toggleEmphasisCommand.key);
          break;
        case "inlineCode":
          commands.call(toggleInlineCodeCommand.key);
          break;
        case "link":
          commands.call(toggleLinkCommand.key);
          break;
        default:
          break;
      }
    });
  } catch (e) {
    console.warn("[lunark] crepe mark action failed", action, e);
  }
}
