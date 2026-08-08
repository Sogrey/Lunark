import { message } from "@tauri-apps/plugin-dialog";
import { t } from "@/lib/i18n";

export type SaveChoice = "save" | "discard" | "cancel";

/**
 * 未保存确认：保存 / 不保存 / 取消
 */
export async function askSaveDiscardCancel(
  body: string,
  title = "Lunark",
): Promise<SaveChoice> {
  const saveLabel = t("msg.save");
  const discardLabel = t("msg.discard");
  const cancelLabel = t("msg.cancel");
  try {
    const result = await message(body, {
      title,
      kind: "warning",
      buttons: {
        yes: saveLabel,
        no: discardLabel,
        cancel: cancelLabel,
      },
    });
    if (result === "Yes" || result === saveLabel) return "save";
    if (result === "No" || result === discardLabel) return "discard";
    return "cancel";
  } catch {
    // 浏览器回退：confirm = 保存，再问一次 = 不保存
    const save = window.confirm(t("msg.saveConfirmHint", { body }));
    if (save) return "save";
    const discard = window.confirm(t("msg.discardConfirm"));
    return discard ? "discard" : "cancel";
  }
}
