/**
 * 「关于」里展示的主要依赖（精选，非完整 lockfile）。
 * 前端版本尽量跟 package.json；Rust 侧跟 Cargo.toml 对齐。
 */
import pkg from "../../../package.json";

export type CreditRow = {
  name: string;
  version: string;
  license: string;
};

function stripRange(v: string): string {
  return v.replace(/^[\^~>=<\s]+/, "");
}

function fromPkg(name: string, fallback: string): string {
  const deps = pkg.dependencies as Record<string, string>;
  const dev = pkg.devDependencies as Record<string, string>;
  const raw = deps[name] ?? dev[name];
  return raw ? stripRange(raw) : fallback;
}

export const APP_VERSION = pkg.version;

/** 主要依赖：名称 · 版本 · 使用协议 */
export const MAIN_CREDITS: CreditRow[] = [
  {
    name: "Tauri",
    version: fromPkg("@tauri-apps/api", "2"),
    license: "Apache-2.0 OR MIT",
  },
  { name: "Vue", version: fromPkg("vue", "3"), license: "MIT" },
  { name: "Vite", version: fromPkg("vite", "6"), license: "MIT" },
  { name: "Pinia", version: fromPkg("pinia", "4"), license: "MIT" },
  {
    name: "vue-i18n",
    version: fromPkg("vue-i18n", "11"),
    license: "MIT",
  },
  {
    name: "CodeMirror",
    version: fromPkg("@codemirror/view", "6"),
    license: "MIT",
  },
  {
    name: "Milkdown Crepe",
    version: fromPkg("@milkdown/crepe", "7"),
    license: "MIT",
  },
  {
    name: "markdown-it",
    version: fromPkg("markdown-it", "15"),
    license: "MIT",
  },
  {
    name: "Mermaid",
    version: fromPkg("mermaid", "11"),
    license: "MIT",
  },
  { name: "KaTeX", version: fromPkg("katex", "0.18"), license: "MIT" },
  { name: "Shiki", version: fromPkg("shiki", "4"), license: "MIT" },
  {
    name: "Element Plus",
    version: fromPkg("element-plus", "2"),
    license: "MIT",
  },
  {
    name: "DOMPurify",
    version: fromPkg("dompurify", "3"),
    license: "MPL-2.0 OR Apache-2.0",
  },
  {
    name: "html-to-image",
    version: fromPkg("html-to-image", "1"),
    license: "MIT",
  },
  /** Rust / Typst 导出链路（见 src-tauri/Cargo.toml） */
  { name: "Typst", version: "0.15", license: "Apache-2.0" },
  { name: "pulldown-cmark", version: "0.13.4", license: "MIT" },
];

export function formatCreditsPlain(rows: CreditRow[] = MAIN_CREDITS): string {
  return rows
    .map((r) => `${r.name}: ${r.version} (${r.license})`)
    .join("\n");
}
