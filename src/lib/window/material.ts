import { invoke, isTauri } from "@tauri-apps/api/core";

export type WindowMaterial = "off" | "mica" | "acrylic";

export function isWindowMaterial(v: unknown): v is WindowMaterial {
  return v === "off" || v === "mica" || v === "acrylic";
}

export async function applyWindowMaterial(
  kind: WindowMaterial,
): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke("set_window_material", { kind });
    document.documentElement.dataset.windowMaterial = kind;
  } catch (e) {
    console.warn("[lunark] window material", e);
  }
}
