mod md_typst;
mod pdf;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Dev 下任务栏图标来自 exe 资源；运行时再设一次窗口图标，避免改 icon 后仍显示默认 Tauri
            let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))?;
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_icon(icon);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![pdf::markdown_to_pdf])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
