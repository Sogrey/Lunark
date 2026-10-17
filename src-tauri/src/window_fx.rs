//! Windows 11 窗口材质（Mica / Acrylic）；其它平台忽略。

use tauri::{AppHandle, Manager, WebviewWindow};
use tauri::window::{Effect, EffectsBuilder};

#[tauri::command]
pub fn set_window_material(app: AppHandle, kind: String) -> Result<(), String> {
    let win = app
        .get_webview_window("main")
        .ok_or_else(|| "main window missing".to_string())?;
    apply_material(&win, kind.trim())
}

fn apply_material(win: &WebviewWindow, kind: &str) -> Result<(), String> {
    #[cfg(not(windows))]
    {
        let _ = (win, kind);
        return Ok(());
    }

    #[cfg(windows)]
    {
        match kind {
            "off" | "" => {
                win.set_effects(None).map_err(|e| e.to_string())?;
            }
            "mica" => {
                win.set_effects(Some(
                    EffectsBuilder::new()
                        .effect(Effect::MicaDark)
                        .build(),
                ))
                .map_err(|e| e.to_string())?;
            }
            "acrylic" => {
                win.set_effects(Some(
                    EffectsBuilder::new().effect(Effect::Acrylic).build(),
                ))
                .map_err(|e| e.to_string())?;
            }
            other => return Err(format!("unknown material: {other}")),
        }
        Ok(())
    }
}
