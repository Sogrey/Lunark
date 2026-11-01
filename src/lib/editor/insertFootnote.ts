import { getFormatBridge } from "@/lib/editor/formatBridge";
import { footnoteSnippet, nextFootnoteId } from "@/lib/markdown/footnotes";
import { t } from "@/lib/i18n";

/** 按当前文档已有脚注分配 id，插入引用 + 定义；id 选中便于改成自定义标签 */
export function insertFootnote(): void {
  const bridge = getFormatBridge();
  if (!bridge) return;
  const id = nextFootnoteId(bridge.getMarkdown());
  bridge.insertSnippet(footnoteSnippet(id, t("editor.footnoteBody")));
}
