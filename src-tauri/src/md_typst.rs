//! Markdown (GFM 子集) → Typst markup（避免未闭合定界符）

use std::collections::HashMap;

use pulldown_cmark::{CodeBlockKind, CowStr, Event, Options, Parser, Tag, TagEnd};

const MATH_PLACEHOLDER_PREFIX: &str = "LUNARKMATH";

pub fn markdown_to_typst_with_font(markdown: &str, font_family: &str) -> String {
    let body = strip_front_matter(markdown);
    let (body, math_slots) = extract_math_placeholders(&body);

    let mut opts = Options::empty();
    opts.insert(Options::ENABLE_TABLES);
    opts.insert(Options::ENABLE_STRIKETHROUGH);
    opts.insert(Options::ENABLE_TASKLISTS);
    opts.insert(Options::ENABLE_FOOTNOTES);

    let events: Vec<Event<'_>> = Parser::new_ext(&body, opts).collect();
    let footnotes = collect_footnote_bodies(&events);

    let mut out = String::from(&typst_preamble(font_family));
    let mut in_code = false;
    let mut in_image = false;
    let mut list_stack: Vec<bool> = Vec::new();
    let mut table_rows: Vec<Vec<String>> = Vec::new();
    let mut table_row: Vec<String> = Vec::new();
    let mut cell_buf = String::new();
    let mut in_table_cell = false;
    let mut heading_buf = String::new();
    let mut in_heading = false;
    let mut heading_level = 1u8;
    let mut i = 0usize;

    while i < events.len() {
        if matches!(&events[i], Event::Start(Tag::FootnoteDefinition(_))) {
            i += 1;
            while i < events.len()
                && !matches!(&events[i], Event::End(TagEnd::FootnoteDefinition))
            {
                i += 1;
            }
            if i < events.len() {
                i += 1;
            }
            continue;
        }

        match &events[i] {
            Event::Start(Tag::Heading { level, .. }) => {
                in_heading = true;
                heading_level = *level as u8;
                heading_buf.clear();
            }
            Event::End(TagEnd::Heading(_)) => {
                in_heading = false;
                let marks = "=".repeat(heading_level.max(1) as usize);
                out.push_str(&format!("\n{marks} {}\n\n", heading_buf.trim()));
            }
            Event::Start(Tag::Paragraph) => {
                if !in_table_cell && !in_image {
                    out.push('\n');
                }
            }
            Event::End(TagEnd::Paragraph) => {
                if !in_table_cell && !in_image {
                    out.push_str("\n\n");
                }
            }
            Event::Start(Tag::CodeBlock(kind)) => {
                in_code = true;
                let lang = match kind {
                    CodeBlockKind::Fenced(l) => l.to_string(),
                    CodeBlockKind::Indented => String::new(),
                };
                out.push_str("\n#raw(block: true");
                if !lang.is_empty() {
                    out.push_str(&format!(", lang: \"{}\"", escape_str(&lang)));
                }
                out.push_str(", \"");
            }
            Event::End(TagEnd::CodeBlock) => {
                in_code = false;
                out.push_str("\")\n\n");
            }
            Event::Start(Tag::List(start)) => {
                list_stack.push(start.is_some());
            }
            Event::End(TagEnd::List(_)) => {
                list_stack.pop();
                out.push('\n');
            }
            Event::Start(Tag::Item) => {
                let depth = list_stack.len().saturating_sub(1);
                out.push_str(&"  ".repeat(depth));
                let ordered = list_stack.last().copied().unwrap_or(false);
                if ordered {
                    out.push_str("+ ");
                } else {
                    out.push_str("- ");
                }
            }
            Event::End(TagEnd::Item) => {
                out.push('\n');
            }
            Event::TaskListMarker(checked) => {
                out.push_str(if *checked { "☑ " } else { "☐ " });
            }
            Event::Start(Tag::BlockQuote(_)) => {
                out.push_str("\n#quote[");
            }
            Event::End(TagEnd::BlockQuote(_)) => {
                out.push_str("]\n\n");
            }
            Event::Start(Tag::Emphasis) => {
                push_markup(
                    &mut out,
                    &mut heading_buf,
                    &mut cell_buf,
                    in_heading,
                    in_table_cell,
                    "#emph[",
                );
            }
            Event::End(TagEnd::Emphasis) => {
                push_markup(
                    &mut out,
                    &mut heading_buf,
                    &mut cell_buf,
                    in_heading,
                    in_table_cell,
                    "]",
                );
            }
            Event::Start(Tag::Strong) => {
                push_markup(
                    &mut out,
                    &mut heading_buf,
                    &mut cell_buf,
                    in_heading,
                    in_table_cell,
                    "#strong[",
                );
            }
            Event::End(TagEnd::Strong) => {
                push_markup(
                    &mut out,
                    &mut heading_buf,
                    &mut cell_buf,
                    in_heading,
                    in_table_cell,
                    "]",
                );
            }
            Event::Start(Tag::Strikethrough) => {
                push_markup(
                    &mut out,
                    &mut heading_buf,
                    &mut cell_buf,
                    in_heading,
                    in_table_cell,
                    "#strike[",
                );
            }
            Event::End(TagEnd::Strikethrough) => {
                push_markup(
                    &mut out,
                    &mut heading_buf,
                    &mut cell_buf,
                    in_heading,
                    in_table_cell,
                    "]",
                );
            }
            Event::Start(Tag::Link { dest_url, .. }) => {
                let open = format!("#link(\"{}\")[", escape_str(dest_url));
                push_markup(
                    &mut out,
                    &mut heading_buf,
                    &mut cell_buf,
                    in_heading,
                    in_table_cell,
                    &open,
                );
            }
            Event::End(TagEnd::Link) => {
                push_markup(
                    &mut out,
                    &mut heading_buf,
                    &mut cell_buf,
                    in_heading,
                    in_table_cell,
                    "]",
                );
            }
            Event::Start(Tag::Image { dest_url, .. }) => {
                in_image = true;
                let path = dest_url.replace('\\', "/");
                let path = path.trim_start_matches("./");
                let path = percent_decode(path);
                out.push_str(&format!(
                    "\n#image(\"{}\", width: 80%)\n\n",
                    escape_str(&path)
                ));
            }
            Event::End(TagEnd::Image) => {
                in_image = false;
            }
            Event::Start(Tag::Table(_)) => {
                table_rows.clear();
            }
            Event::End(TagEnd::Table) => {
                emit_table(&mut out, &table_rows);
                table_rows.clear();
            }
            Event::Start(Tag::TableHead) | Event::Start(Tag::TableRow) => {
                table_row.clear();
            }
            Event::End(TagEnd::TableHead) | Event::End(TagEnd::TableRow) => {
                table_rows.push(std::mem::take(&mut table_row));
            }
            Event::Start(Tag::TableCell) => {
                in_table_cell = true;
                cell_buf.clear();
            }
            Event::End(TagEnd::TableCell) => {
                in_table_cell = false;
                table_row.push(std::mem::take(&mut cell_buf));
            }
            Event::Rule => {
                out.push_str("\n#line(length: 100%)\n\n");
            }
            Event::Text(text) => {
                if !in_image {
                    if in_code {
                        out.push_str(&escape_str(text.as_ref()));
                    } else {
                        push_text(
                            &mut out,
                            &mut heading_buf,
                            &mut cell_buf,
                            in_heading,
                            in_table_cell,
                            text,
                        );
                    }
                }
            }
            Event::Code(code) => {
                if !in_image {
                    let piece = format!("#raw(\"{}\")", escape_str(code.as_ref()));
                    if in_heading {
                        heading_buf.push_str(&piece);
                    } else if in_table_cell {
                        cell_buf.push_str(&piece);
                    } else {
                        out.push_str(&piece);
                    }
                }
            }
            Event::SoftBreak => {
                if !in_image {
                    if in_heading {
                        heading_buf.push(' ');
                    } else if in_table_cell {
                        cell_buf.push(' ');
                    } else if in_code {
                        out.push_str("\\n");
                    } else {
                        out.push(' ');
                    }
                }
            }
            Event::HardBreak => {
                if !in_image {
                    if in_code {
                        out.push_str("\\n");
                    } else {
                        out.push_str(" \\\n");
                    }
                }
            }
            Event::Html(_) | Event::InlineHtml(_) => {}
            Event::FootnoteReference(name) => {
                if let Some(body) = footnotes.get(name.as_ref()) {
                    out.push_str(&format!("#footnote[{body}]"));
                } else {
                    out.push_str(&format!("#super[{}]", escape_text(name)));
                }
            }
            _ => {}
        }
        i += 1;
    }

    restore_math_placeholders(&out, &math_slots)
}

fn collect_footnote_bodies(events: &[Event<'_>]) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let mut i = 0usize;
    while i < events.len() {
        if let Event::Start(Tag::FootnoteDefinition(name)) = &events[i] {
            let name = name.to_string();
            i += 1;
            let start = i;
            while i < events.len()
                && !matches!(&events[i], Event::End(TagEnd::FootnoteDefinition))
            {
                i += 1;
            }
            let body = events_to_typst_fragment(&events[start..i]);
            map.insert(name, body.trim().to_string());
            if i < events.len() {
                i += 1;
            }
        } else {
            i += 1;
        }
    }
    map
}

/// 脚注定义体 → Typst 片段（供 `#footnote[...]`）
fn events_to_typst_fragment(events: &[Event<'_>]) -> String {
    let mut out = String::new();
    for event in events {
        match event {
            Event::Start(Tag::Paragraph) | Event::End(TagEnd::Paragraph) => {
                if !out.is_empty() && !out.ends_with(' ') {
                    out.push(' ');
                }
            }
            Event::Text(text) => out.push_str(&escape_text(text)),
            Event::Code(code) => {
                out.push_str(&format!("#raw(\"{}\")", escape_str(code.as_ref())));
            }
            Event::SoftBreak | Event::HardBreak => out.push(' '),
            Event::Start(Tag::Emphasis) => out.push_str("#emph["),
            Event::End(TagEnd::Emphasis) => out.push(']'),
            Event::Start(Tag::Strong) => out.push_str("#strong["),
            Event::End(TagEnd::Strong) => out.push(']'),
            Event::Start(Tag::Strikethrough) => out.push_str("#strike["),
            Event::End(TagEnd::Strikethrough) => out.push(']'),
            Event::Start(Tag::Link { dest_url, .. }) => {
                out.push_str(&format!("#link(\"{}\")[", escape_str(dest_url)));
            }
            Event::End(TagEnd::Link) => out.push(']'),
            _ => {}
        }
    }
    out
}

fn typst_preamble(font_family: &str) -> String {
    // 转义字体名里的引号（正常族名不会有）
    let font = font_family.replace('"', "\\\"");
    format!(
        r#"#set page(paper: "a4", margin: (x: 2cm, y: 2.2cm))
#set text(
  lang: "zh",
  size: 11pt,
  font: "{font}",
  fallback: false,
)
#show raw: set text(font: "{font}")
#set par(justify: true, leading: 0.75em)
#set heading(numbering: none)
#show link: underline

"#
    )
}

fn strip_front_matter(src: &str) -> String {
    let trimmed = src.trim_start();
    if !trimmed.starts_with("---") {
        return src.to_string();
    }
    let rest = &trimmed[3..];
    if let Some(end) = rest.find("\n---") {
        let after = &rest[end + 4..];
        return after.trim_start_matches(['\r', '\n']).to_string();
    }
    src.to_string()
}

struct MathSlot {
    display: bool,
    latex: String,
}

/// 抽出数学公式，换成不会被 Typst/[转义弄坏的占位符
fn extract_math_placeholders(src: &str) -> (String, Vec<MathSlot>) {
    let mut slots = Vec::new();
    let mut out = String::with_capacity(src.len());
    let bytes = src.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'$' {
            let display = i + 1 < bytes.len() && bytes[i + 1] == b'$';
            let start = if display { i + 2 } else { i + 1 };
            let delim_len = if display { 2 } else { 1 };
            if let Some(rel) = find_closing_dollar(bytes, start, delim_len) {
                let end = start + rel;
                let latex = src[start..end].trim().to_string();
                let id = slots.len();
                slots.push(MathSlot { display, latex });
                out.push_str(&format!("{MATH_PLACEHOLDER_PREFIX}{id}END"));
                i = end + delim_len;
                continue;
            }
        }
        // 必须按 Unicode 标量复制；`bytes[i] as char` 会把中文拆成 æ/□ 乱码
        let ch = src[i..].chars().next().expect("utf-8");
        out.push(ch);
        i += ch.len_utf8();
    }
    (out, slots)
}

fn restore_math_placeholders(typst: &str, slots: &[MathSlot]) -> String {
    let mut out = typst.to_string();
    for (i, slot) in slots.iter().enumerate() {
        let key = format!("{MATH_PLACEHOLDER_PREFIX}{i}END");
        let math = latex_to_typst_math(&slot.latex);
        // Typst 数学：行内 $...$ / 块级单独一行
        let replacement = if slot.display {
            format!("\n$ {math} $\n")
        } else {
            format!("${math}$")
        };
        out = out.replace(&key, &replacement);
    }
    out
}

/// 常见 KaTeX/LaTeX → Typst math（覆盖欢迎页与日常公式）
fn latex_to_typst_math(latex: &str) -> String {
    let mut s = latex.trim().to_string();

    // 空白与定界
    for pat in [r"\,", r"\;", r"\:", r"\!", r"\ ", r"\quad", r"\qquad"] {
        s = s.replace(pat, " ");
    }
    s = s.replace(r"\left", "").replace(r"\right", "");
    s = s.replace(r"\cdot", " dot ").replace(r"\times", " times ");
    s = s.replace(r"\leq", " <=").replace(r"\geq", " >=");
    s = s.replace(r"\neq", " !=").replace(r"\approx", " approx ");
    s = s.replace(r"\pm", " plus.minus ").replace(r"\mp", " minus.plus ");

    // 函数 / 符号（长词优先）
    let pairs = [
        (r"\infty", "oo"),
        (r"\partial", "diff"),
        (r"\nabla", "nabla"),
        (r"\int", "integral"),
        (r"\sum", "sum"),
        (r"\prod", "product"),
        (r"\lim", "lim"),
        (r"\sin", "sin"),
        (r"\cos", "cos"),
        (r"\tan", "tan"),
        (r"\log", "log"),
        (r"\ln", "ln"),
        (r"\exp", "exp"),
        (r"\pi", "pi"),
        (r"\theta", "theta"),
        (r"\alpha", "alpha"),
        (r"\beta", "beta"),
        (r"\gamma", "gamma"),
        (r"\delta", "delta"),
        (r"\epsilon", "epsilon"),
        (r"\lambda", "lambda"),
        (r"\mu", "mu"),
        (r"\sigma", "sigma"),
        (r"\phi", "phi"),
        (r"\omega", "omega"),
        (r"\mathrm{d}", "dif "),
        (r"\mathrm", ""),
        (r"\mathbf", ""),
        (r"\boldsymbol", ""),
        (r"\text", ""),
    ];
    for (a, b) in pairs {
        s = s.replace(a, b);
    }

    // \frac{a}{b} → frac(a, b)
    while let Some(rest) = s.find(r"\frac") {
        if let Some((a, b, end)) = parse_two_braced_args(&s[rest + 5..]) {
            let repl = format!("frac({}, {})", latex_to_typst_math(&a), latex_to_typst_math(&b));
            s = format!("{}{}{}", &s[..rest], repl, &s[rest + 5 + end..]);
        } else {
            break;
        }
    }

    // \sqrt{x} → sqrt(x) ；\sqrt[n]{x} 简化为 root
    while let Some(rest) = s.find(r"\sqrt") {
        let after = &s[rest + 5..];
        if let Some((inner, end)) = parse_braced(after) {
            let repl = format!("sqrt({})", latex_to_typst_math(&inner));
            s = format!("{}{}{}", &s[..rest], repl, &s[rest + 5 + end..]);
        } else {
            break;
        }
    }

    // ^{...} → ^(...)  _{...} → _(...)
    s = rewrite_latex_scripts(&s);

    // 清理残留反斜杠命令名 → 去掉反斜杠保留名字
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\\' {
            let mut name = String::new();
            while let Some(n) = chars.peek() {
                if n.is_ascii_alphabetic() {
                    name.push(chars.next().unwrap());
                } else {
                    break;
                }
            }
            if name.is_empty() {
                if let Some(n) = chars.next() {
                    out.push(n);
                }
            } else {
                out.push_str(&name);
            }
        } else {
            out.push(c);
        }
    }
    let mut joined = out.split_whitespace().collect::<Vec<_>>().join(" ");
    joined = joined
        .replace(" dx", " dif x")
        .replace(" dy", " dif y")
        .replace(" dz", " dif z");
    space_math_letter_runs(&joined)
}

/// Typst 数学里连续字母是单个变量；`mc^2` 需写成 `m c^2`
fn space_math_letter_runs(s: &str) -> String {
    const KEEP: &[&str] = &[
        "integral", "sum", "product", "sin", "cos", "tan", "log", "ln", "exp", "lim",
        "frac", "sqrt", "dif", "oo", "pi", "theta", "alpha", "beta", "gamma", "delta",
        "epsilon", "lambda", "mu", "sigma", "phi", "omega", "approx", "times", "nabla",
        "dot", "plus", "minus",
    ];
    let mut out = String::with_capacity(s.len() * 2);
    let mut run = String::new();
    let flush = |run: &mut String, out: &mut String| {
        if run.is_empty() {
            return;
        }
        if KEEP.contains(&run.as_str()) || run.chars().all(|c| c.is_ascii_digit()) {
            out.push_str(run);
        } else {
            for (i, ch) in run.chars().enumerate() {
                if i > 0 {
                    out.push(' ');
                }
                out.push(ch);
            }
        }
        run.clear();
    };
    for c in s.chars() {
        if c.is_ascii_alphabetic() {
            run.push(c);
        } else {
            flush(&mut run, &mut out);
            out.push(c);
        }
    }
    flush(&mut run, &mut out);
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn parse_braced(s: &str) -> Option<(String, usize)> {
    let trim = s.len() - s.trim_start().len();
    let t = s.trim_start();
    if !t.starts_with('{') {
        return None;
    }
    let mut depth = 0i32;
    for (i, c) in t.char_indices() {
        match c {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    return Some((t[1..i].to_string(), trim + i + 1));
                }
            }
            _ => {}
        }
    }
    None
}

fn parse_two_braced_args(s: &str) -> Option<(String, String, usize)> {
    let (a, e1) = parse_braced(s)?;
    let (b, e2) = parse_braced(&s[e1..])?;
    Some((a, b, e1 + e2))
}

fn rewrite_latex_scripts(s: &str) -> String {
    let chars: Vec<char> = s.chars().collect();
    let mut out = String::with_capacity(s.len());
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if (c == '^' || c == '_') && i + 1 < chars.len() && chars[i + 1] == '{' {
            out.push(c);
            let mut depth = 0i32;
            let mut inner = String::new();
            let mut j = i + 1;
            while j < chars.len() {
                match chars[j] {
                    '{' => {
                        if depth > 0 {
                            inner.push('{');
                        }
                        depth += 1;
                    }
                    '}' => {
                        depth -= 1;
                        if depth == 0 {
                            j += 1;
                            break;
                        }
                        inner.push('}');
                    }
                    ch => inner.push(ch),
                }
                j += 1;
            }
            out.push('(');
            out.push_str(&rewrite_latex_scripts(&inner));
            out.push(')');
            i = j;
            continue;
        }
        out.push(c);
        i += 1;
    }
    out
}

fn find_closing_dollar(bytes: &[u8], start: usize, delim_len: usize) -> Option<usize> {
    let mut i = start;
    while i < bytes.len() {
        if delim_len == 2 {
            if bytes[i] == b'$' && i + 1 < bytes.len() && bytes[i + 1] == b'$' {
                return Some(i - start);
            }
        } else if bytes[i] == b'$' {
            return Some(i - start);
        }
        i += 1;
    }
    None
}

fn push_markup(
    out: &mut String,
    heading_buf: &mut String,
    cell_buf: &mut String,
    in_heading: bool,
    in_table_cell: bool,
    piece: &str,
) {
    if in_heading {
        heading_buf.push_str(piece);
    } else if in_table_cell {
        cell_buf.push_str(piece);
    } else {
        out.push_str(piece);
    }
}

fn push_text(
    out: &mut String,
    heading_buf: &mut String,
    cell_buf: &mut String,
    in_heading: bool,
    in_table_cell: bool,
    text: &CowStr<'_>,
) {
    let escaped = escape_text(text);
    push_markup(
        out,
        heading_buf,
        cell_buf,
        in_heading,
        in_table_cell,
        &escaped,
    );
}

fn emit_table(out: &mut String, rows: &[Vec<String>]) {
    if rows.is_empty() {
        return;
    }
    let cols = rows.iter().map(|r| r.len()).max().unwrap_or(1).max(1);
    out.push_str("\n#table(\n");
    out.push_str(&format!("  columns: {cols},\n"));
    out.push_str("  inset: 6pt,\n");
    out.push_str("  stroke: 0.5pt + luma(180),\n");
    for (ri, row) in rows.iter().enumerate() {
        for ci in 0..cols {
            // 单元格内容在写入时已 escape / 含 #raw，勿二次转义
            let cell = row.get(ci).map(|s| s.as_str()).unwrap_or("");
            if ri == 0 {
                out.push_str(&format!("  [#strong[{cell}]],\n"));
            } else {
                out.push_str(&format!("  [{cell}],\n"));
            }
        }
    }
    out.push_str(")\n\n");
}

fn escape_text(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            // Typst 标记字符，必须转义（尤其是 []，任务列表曾因此炸编译）
            '#' | '$' | '*' | '_' | '`' | '<' | '>' | '@' | '\\' | '[' | ']' => {
                out.push('\\');
                out.push(c);
            }
            _ => out.push(c),
        }
    }
    out
}

fn escape_str(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '\\' => out.push_str("\\\\"),
            '"' => out.push_str("\\\""),
            '\n' => out.push_str("\\n"),
            '\r' => {}
            '\t' => out.push_str("\\t"),
            _ => out.push(c),
        }
    }
    out
}

fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = (from_hex(bytes[i + 1]), from_hex(bytes[i + 2])) {
                out.push((h << 4) | l);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn from_hex(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn markdown_to_typst(markdown: &str) -> String {
        markdown_to_typst_with_font(markdown, "FangSong")
    }

    #[test]
    fn chinese_survives_math_extract() {
        let (body, _) = extract_math_placeholders("月刻 $E=mc^2$ 测试");
        assert!(body.contains('月'), "{body}");
        assert!(body.contains('刻'), "{body}");
        assert!(!body.contains('æ'), "mojibake leaked: {body}");
        assert!(body.contains("LUNARKMATH0END"), "{body}");
    }

    #[test]
    fn latex_integral_becomes_typst_math() {
        let t = latex_to_typst_math(r"\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}");
        assert!(t.contains("integral"), "{t}");
        assert!(t.contains("oo"), "{t}");
        assert!(t.contains("sqrt"), "{t}");
        assert!(t.contains("pi"), "{t}");
        let typ = markdown_to_typst("行内 $E = mc^2$\n\n$$\n\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}\n$$\n");
        assert!(typ.contains("$E = m c^2$") || typ.contains("$E = mc^2$"), "{typ}");
        assert!(typ.contains("integral"), "{typ}");
        assert!(!typ.contains("#raw(\"E"), "{typ}");
    }

    #[test]
    fn nested_list_is_indented() {
        let typ = markdown_to_typst("- a\n  - b\n    - c\n");
        assert!(typ.contains("- a"), "{typ}");
        assert!(typ.contains("  - b"), "{typ}");
        assert!(typ.contains("    - c"), "{typ}");
    }

    #[test]
    fn footnote_becomes_typst_footnote() {
        let md = "Hello[^1]\n\n[^1]: footnote body with **bold**\n";
        let typ = markdown_to_typst(md);
        assert!(typ.contains("#footnote["), "{typ}");
        assert!(typ.contains("footnote body"), "{typ}");
        assert!(typ.contains("#strong["), "{typ}");
        assert!(!typ.contains("[^1]"), "{typ}");
        compile_typst(&typ).expect(&typ);
    }

    #[test]
    fn task_list_does_not_emit_brackets() {
        let typ = markdown_to_typst("- [x] done\n- [ ] todo\n");
        assert!(!typ.contains("[x]"), "{typ}");
        assert!(!typ.contains("[ ]"), "{typ}");
        assert!(typ.contains("☑") || typ.contains("☐"), "{typ}");
    }

    #[test]
    fn math_becomes_typst_dollar() {
        let typ = markdown_to_typst("行内 $E = mc^2$ 与\n\n$$\\int x$$\n");
        assert!(typ.contains("$E = m c^2$") || typ.contains("$ E = m c^2 $"), "{typ}");
        assert!(typ.contains("integral"), "{typ}");
        assert!(!typ.contains("#raw(\"E"), "{typ}");
    }

    #[test]
    fn brackets_in_text_are_escaped() {
        let typ = markdown_to_typst("see [link-looking] text\n");
        assert!(typ.contains("\\[") || typ.contains("\\]"), "{typ}");
    }

    fn compile_typst(src: &str) -> Result<(), String> {
        use typst_as_lib::typst_kit_options::TypstKitFontOptions;
        use typst_as_lib::TypstEngine;

        let engine = TypstEngine::builder()
            .main_file(src.to_string())
            .search_fonts_with(
                TypstKitFontOptions::default()
                    .include_system_fonts(true)
                    .include_embedded_fonts(true),
            )
            .build();
        let warned = engine.compile();
        let doc = warned.output.map_err(|e| format!("{e:?}"))?;
        let _ = typst_pdf::pdf(&doc, &Default::default()).map_err(|e| format!("{e:?}"))?;
        Ok(())
    }

    #[test]
    fn strong_with_equals_compiles() {
        let typ = markdown_to_typst("轻量 **一期 = 方案 B** 编辑器\n");
        assert!(typ.contains("#strong["), "{typ}");
        assert!(!typ.contains("*一期"), "{typ}");
        compile_typst(&typ).expect(&typ);
    }

    #[test]
    fn bundled_welcome_compiles() {
        let welcome = include_str!("../../src/assets/welcome.md");
        let md = welcome
            .lines()
            .filter(|l| !l.trim_start().starts_with("!["))
            .collect::<Vec<_>>()
            .join("\n");
        let typ = markdown_to_typst(&md);
        assert!(!typ.contains("[x]"), "task list leaked");
        assert!(typ.contains('月') || typ.contains("Lunark") || typ.contains("月刻"), "{typ}");
        compile_typst(&typ).unwrap_or_else(|e| panic!("compile failed: {e}\n---\n{typ}"));
    }
}
