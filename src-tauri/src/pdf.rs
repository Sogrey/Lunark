//! Typst 引擎：Markdown → PDF

use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;

use typst::foundations::Bytes;
use typst::text::Font;
use typst_as_lib::typst_kit_options::TypstKitFontOptions;
use typst_as_lib::TypstEngine;

use crate::md_typst;

/// 加载导出用中文字体（进程内只读一次）。
/// 优先：内置静态 OTF → 系统仿宋/楷体/黑体（单文件 TTF）→ 避免 *.ttc / *-VF。
fn cached_fonts() -> &'static [Font] {
    static FONTS: OnceLock<Vec<Font>> = OnceLock::new();
    FONTS
        .get_or_init(|| {
            let mut fonts = Vec::new();
            for path in preferred_font_paths() {
                match fs::read(&path) {
                    Ok(data) => {
                        let n = fonts.len();
                        fonts.extend(Font::iter(Bytes::new(data)));
                        eprintln!(
                            "[lunark typst] font {} → {} face(s)",
                            path.display(),
                            fonts.len() - n
                        );
                    }
                    Err(e) => eprintln!("[lunark typst] skip {}: {e}", path.display()),
                }
            }
            if fonts.is_empty() {
                eprintln!("[lunark typst] WARNING: no preferred fonts loaded");
            } else {
                let families: Vec<_> = fonts.iter().map(|f| f.info().family.as_str()).collect();
                eprintln!("[lunark typst] families: {families:?}");
            }
            fonts
        })
        .as_slice()
}

fn preferred_font_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    // 方案 C：内置静态 OTF（src-tauri/fonts）
    let bundled = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fonts");
    if bundled.is_dir() {
        let mut otfs: Vec<PathBuf> = fs::read_dir(&bundled)
            .into_iter()
            .flatten()
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                p.extension().and_then(|x| x.to_str()) == Some("otf")
                    && fs::metadata(p).map(|m| m.len() > 1_000_000).unwrap_or(false)
            })
            .collect();
        otfs.sort();
        if !otfs.is_empty() {
            return otfs;
        }
    }

    let windir = std::env::var_os("WINDIR").unwrap_or_else(|| r"C:\Windows".into());
    let dir = PathBuf::from(windir).join("Fonts");
    // 系统回退：单文件 TTF（PDF 子集化常失败，仅作无内置字体时的兜底）
    for name in ["simfang.ttf", "simkai.ttf", "simhei.ttf"] {
        let p = dir.join(name);
        if p.is_file() {
            paths.push(p);
            break;
        }
    }
    paths
}

/// 当前应写入 Typst preamble 的主字体族名
pub fn primary_font_family() -> &'static str {
    static NAME: OnceLock<String> = OnceLock::new();
    NAME.get_or_init(|| {
        cached_fonts()
            .first()
            .map(|f| f.info().family.clone())
            .unwrap_or_else(|| "SimHei".into())
    })
    .as_str()
}

/// 将 Markdown 编译为 PDF（Typst）。
#[tauri::command]
pub async fn markdown_to_pdf(
    markdown: String,
    pdf_path: String,
    resource_dir: Option<String>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        markdown_to_pdf_sync(markdown, pdf_path, resource_dir)
    })
    .await
    .map_err(|e| format!("导出任务失败: {e}"))?
}

/// 供单元测试 / 内部调用的同步实现
pub fn markdown_to_pdf_sync(
    markdown: String,
    pdf_path: String,
    resource_dir: Option<String>,
) -> Result<(), String> {
    let pdf = PathBuf::from(&pdf_path);
    if let Some(parent) = pdf.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    let family = primary_font_family();
    let typst_src = md_typst::markdown_to_typst_with_font(&markdown, family);

    let work_dir = resource_dir
        .as_deref()
        .map(PathBuf::from)
        .filter(|p| p.is_dir())
        .unwrap_or_else(std::env::temp_dir);

    let fonts = cached_fonts();
    if fonts.is_empty() {
        return Err(
            "未找到可用中文字体（期望 fonts/*.otf 或 Windows\\Fonts\\simfang.ttf）".into(),
        );
    }

    let engine = TypstEngine::builder()
        .main_file(typst_src.clone())
        // 中文：内置思源；公式：Typst 嵌入的 New Computer Modern Math
        .fonts(fonts.iter().cloned())
        .search_fonts_with(
            TypstKitFontOptions::default()
                .include_system_fonts(false)
                .include_embedded_fonts(true),
        )
        .with_file_system_resolver(&work_dir)
        .build();

    let warned = engine.compile();
    let doc = match warned.output {
        Ok(doc) => doc,
        Err(errs) => {
            let dump = work_dir.join("lunark-last-export.typ");
            let _ = fs::write(&dump, &typst_src);
            return Err(format!(
                "Typst 编译失败: {}\n（已写出调试文件: {}）",
                format_typst_errors(&errs),
                dump.display()
            ));
        }
    };

    for w in &warned.warnings {
        eprintln!("[lunark typst] warning: {w:?}");
    }

    let pdf_bytes =
        typst_pdf::pdf(&doc, &Default::default()).map_err(|e| format!("生成 PDF 失败: {e:?}"))?;

    fs::write(&pdf, pdf_bytes).map_err(|e| format!("写入 PDF 失败: {e}"))?;
    Ok(())
}

fn format_typst_errors(errs: &impl std::fmt::Debug) -> String {
    format!("{errs:?}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fangsong_or_bundled_font_loads() {
        let paths = preferred_font_paths();
        assert!(!paths.is_empty(), "no font paths");
        let fam = primary_font_family();
        eprintln!("primary font family = {fam}, path = {:?}", paths[0]);
        assert!(!cached_fonts().is_empty());
    }

    #[test]
    fn export_sample_to_temp() {
        let fam = primary_font_family();
        let md = format!("# 月刻中文测试（{fam}）\n\n轻量本地 Markdown 编辑器。\n");
        let dir = std::env::temp_dir().join("lunark-pdf-tests");
        let _ = fs::create_dir_all(&dir);
        let out = dir.join("sample.pdf");
        markdown_to_pdf_sync(md, out.to_string_lossy().into(), None).expect("pdf");
        assert!(out.metadata().map(|m| m.len() > 500).unwrap_or(false));
    }
}
