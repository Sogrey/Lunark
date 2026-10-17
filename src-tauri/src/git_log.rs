//! 当前文件的 git 提交时间线（只读，依赖系统 git）。

use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GitCommitEntry {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub at: i64,
    pub subject: String,
}

fn find_git_root(start: &Path) -> Option<PathBuf> {
    let mut cur = start.to_path_buf();
    if cur.is_file() {
        cur.pop();
    }
    loop {
        if cur.join(".git").exists() {
            return Some(cur);
        }
        if !cur.pop() {
            return None;
        }
    }
}

fn rel_to_root(root: &Path, file: &Path) -> Option<String> {
    let rel = file.strip_prefix(root).ok()?;
    Some(rel.to_string_lossy().replace('\\', "/"))
}

#[tauri::command]
pub fn git_file_log(file_path: String, limit: Option<u32>) -> Result<Vec<GitCommitEntry>, String> {
    let path = PathBuf::from(file_path.trim());
    if !path.is_absolute() {
        return Err("path must be absolute".into());
    }
    if !path.is_file() {
        return Err("not a file".into());
    }
    let root = find_git_root(&path).ok_or_else(|| "not a git repository".to_string())?;
    let rel = rel_to_root(&root, &path).ok_or_else(|| "file outside repo".to_string())?;
    let n = limit.unwrap_or(40).clamp(1, 100);

    let output = Command::new("git")
        .args([
            "-C",
            root.to_str().ok_or("invalid repo path")?,
            "log",
            &format!("-n{n}"),
            "--follow",
            "--date=unix",
            "--pretty=format:%H%x09%an%x09%at%x09%s",
            "--",
            &rel,
        ])
        .output()
        .map_err(|e| format!("git not available: {e}"))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(err.trim().to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut out = Vec::new();
    for line in stdout.lines() {
        let parts: Vec<&str> = line.splitn(4, '\t').collect();
        if parts.len() < 4 {
            continue;
        }
        let hash = parts[0].to_string();
        let at = parts[2].parse::<i64>().unwrap_or(0);
        out.push(GitCommitEntry {
            short_hash: hash.chars().take(7).collect(),
            hash,
            author: parts[1].to_string(),
            at,
            subject: parts[3].to_string(),
        });
    }
    Ok(out)
}

#[tauri::command]
pub fn git_show_file(file_path: String, commit: String) -> Result<String, String> {
    let path = PathBuf::from(file_path.trim());
    let root = find_git_root(&path).ok_or_else(|| "not a git repository".to_string())?;
    let rel = rel_to_root(&root, &path).ok_or_else(|| "file outside repo".to_string())?;
    let rev = commit.trim();
    if rev.is_empty() || rev.contains("..") || rev.contains(char::is_whitespace) {
        return Err("invalid commit".into());
    }

    let output = Command::new("git")
        .args([
            "-C",
            root.to_str().ok_or("invalid repo path")?,
            "show",
            &format!("{rev}:{rel}"),
        ])
        .output()
        .map_err(|e| format!("git not available: {e}"))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(err.trim().to_string());
    }
    String::from_utf8(output.stdout).map_err(|e| e.to_string())
}
