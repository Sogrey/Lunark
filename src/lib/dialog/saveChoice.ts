import { message } from "@tauri-apps/plugin-dialog";

export type SaveChoice = "save" | "discard" | "cancel";

/**
 * 未保存确认：保存 / 不保存 / 取消
 */
export async function askSaveDiscardCancel(
  body: string,
  title = "Lunark",
): Promise<SaveChoice> {
  try {
    const result = await message(body, {
      title,
      kind: "warning",
      buttons: {
        yes: "保存",
        no: "不保存",
        cancel: "取消",
      },
    });
    if (result === "Yes" || result === "保存") return "save";
    if (result === "No" || result === "不保存") return "discard";
    return "cancel";
  } catch {
    // 浏览器回退：confirm = 保存，再问一次 = 不保存
    const save = window.confirm(`${body}\n\n确定 = 保存，取消 = 继续选择`);
    if (save) return "save";
    const discard = window.confirm("不保存并继续？\n确定 = 不保存，取消 = 取消操作");
    return discard ? "discard" : "cancel";
  }
}
