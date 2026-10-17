//! 运行时放行用户通过对话框、拖放或已保存会话选中的路径。
//! 默认能力范围只含用户主目录；这里把选中目录（递归）同步写入 fs 与 asset 协议。

use std::path::{Component, Path, PathBuf};

use tauri::Manager;
use tauri_plugin_fs::FsExt;

fn normal_components(path: &Path) -> usize {
    path.components()
        .filter(|c| {
            !matches!(
                c,
                Component::Prefix(_) | Component::RootDir | Component::CurDir
            )
        })
        .count()
}

fn grant_dir(app: &tauri::AppHandle, dir: &Path) -> Result<(), String> {
    if normal_components(dir) == 0 {
        return Err("refusing to grant a filesystem root".into());
    }
    app.fs_scope()
        .allow_directory(dir, true)
        .map_err(|e| e.to_string())?;
    app.asset_protocol_scope()
        .allow_directory(dir, true)
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn grant_file(app: &tauri::AppHandle, file: &Path) -> Result<(), String> {
    app.fs_scope()
        .allow_file(file)
        .map_err(|e| e.to_string())?;
    app.asset_protocol_scope()
        .allow_file(file)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn grant_user_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let path = PathBuf::from(path.trim());
    if path.as_os_str().is_empty() {
        return Err("empty path".into());
    }
    if !path.is_absolute() {
        return Err("path must be absolute".into());
    }

    if path.is_dir() {
        return grant_dir(&app, &path);
    }

    if let Some(parent) = path.parent() {
        if parent.is_dir() && normal_components(parent) > 0 {
            grant_dir(&app, parent)?;
        }
    }
    grant_file(&app, &path)
}
