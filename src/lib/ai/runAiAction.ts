import { ElMessage } from "element-plus";
import { getFormatBridge } from "@/lib/editor/formatBridge";
import { useEditorStore } from "@/stores/editor";
import { runOllamaAction, type AiAction } from "@/lib/ai/ollama";
import { t } from "@/lib/i18n";

export async function runEditorAiAction(action: AiAction): Promise<void> {
  const editor = useEditorStore();
  if (!editor.ollamaEnabled) {
    ElMessage.info(t("msg.ollamaOffHint"));
    return;
  }
  const bridge = getFormatBridge();
  if (!bridge) {
    ElMessage.warning(t("msg.editorNotReady"));
    return;
  }
  bridge.focus();
  const selected = bridge.getSelectedText();
  let text = selected;
  if (!text.trim()) {
    if (action === "continue" || action === "summarize") {
      text = editor.content.slice(-4000);
    } else {
      ElMessage.info(t("msg.aiNeedSelection"));
      return;
    }
  }

  const loading = ElMessage.info({
    message: t("msg.aiWorking"),
    duration: 0,
    showClose: true,
  });
  try {
    const out = await runOllamaAction(action, text, {
      endpoint: editor.ollamaEndpoint,
      model: editor.ollamaModel,
    });
    if (action === "continue") {
      if (selected.trim()) {
        bridge.replaceSelection(
          `${selected}${out.startsWith("\n") ? "" : "\n"}${out}`,
        );
      } else {
        editor.insertAtCursor(out.startsWith("\n") ? out : `\n${out}`);
      }
    } else if (action === "summarize" && !selected.trim()) {
      editor.insertAtCursor(`\n\n## Summary\n\n${out}\n`);
    } else {
      bridge.replaceSelection(out);
    }
    ElMessage.success(t("msg.aiDone"));
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : t("msg.aiFail"));
  } finally {
    loading.close();
  }
}
