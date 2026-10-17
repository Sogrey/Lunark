mod git_log;
mod md_typst;
mod pdf;
mod scope_grant;
mod window_fx;
mod window_geom;

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
                // 在 show 之前恢复上次尺寸，避免先显示 conf 默认小窗再跳变
                window_geom::restore_before_show(app.handle(), &win);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            pdf::markdown_to_pdf,
            scope_grant::grant_user_path,
            window_fx::set_window_material,
            git_log::git_file_log,
            git_log::git_show_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
