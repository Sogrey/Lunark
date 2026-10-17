//! 启动时从 prefs store 恢复窗口尺寸（在 show 之前，避免先小窗再跳变）。

use tauri::{AppHandle, LogicalPosition, LogicalSize, WebviewWindow};
use tauri_plugin_store::StoreExt;

/// 读取 `lunark-prefs.json` 的 `prefs.window` / `customTitlebar`，在窗口仍隐藏时应用。
pub fn restore_before_show(app: &AppHandle, win: &WebviewWindow) {
    let store = match app.store("lunark-prefs.json") {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[lunark] store open for geometry: {e}");
            return;
        }
    };

    let Some(prefs) = store.get("prefs") else {
        return;
    };

    if let Some(custom) = prefs.get("customTitlebar").and_then(|v| v.as_bool()) {
        let _ = win.set_decorations(!custom);
    }

    let Some(window) = prefs.get("window") else {
        return;
    };
    let Some(width) = window.get("width").and_then(|v| v.as_f64()) else {
        return;
    };
    let Some(height) = window.get("height").and_then(|v| v.as_f64()) else {
        return;
    };
    if !(width.is_finite() && height.is_finite()) || width < 320.0 || height < 240.0 {
        return;
    }

    let w = width.clamp(640.0, 10000.0);
    let h = height.clamp(400.0, 10000.0);
    if let Err(e) = win.set_size(LogicalSize::new(w, h)) {
        eprintln!("[lunark] set_size: {e}");
    }

    let x = window.get("x").and_then(|v| v.as_f64());
    let y = window.get("y").and_then(|v| v.as_f64());
    if let (Some(x), Some(y)) = (x, y) {
        if x.is_finite() && y.is_finite() {
            if let Err(e) = win.set_position(LogicalPosition::new(x, y)) {
                eprintln!("[lunark] set_position: {e}");
            }
        }
    }
}
