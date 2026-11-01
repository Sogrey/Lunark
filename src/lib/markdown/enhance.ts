import { highlightCode } from "@/lib/markdown/shiki";
import { parseFenceInfo } from "@/lib/markdown/fenceInfo";
import { renderMermaidSvg } from "@/lib/markdown/mermaid";
import { useThemeStore } from "@/stores/theme";
import { useEditorStore } from "@/stores/editor";
import { t } from "@/lib/i18n";

function decodeEntities(text: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

function langFromClass(className: string): string {
  const match = /(?:^|\s)language-([^\s]+)/.exec(className);
  return match?.[1] ?? "";
}

function highlightLinesFromCodeEl(codeEl: Element): number[] {
  const attr = codeEl.getAttribute("data-line-highlight");
  if (attr) {
    return attr
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n >= 1);
  }
  // 兜底：language-ts{1,3} 一类 class
  const fromClass = langFromClass(codeEl.className);
  return parseFenceInfo(fromClass).highlightLines;
}

/** 预览代码块外包一层，挂悬浮复制按钮（导出可再剥掉）。 */
export function wrapCodeBlockWithCopy(doc: Document, pre: Element): void {
  if (!(pre instanceof HTMLElement) || pre.tagName !== "PRE") return;
  if (pre.parentElement?.classList.contains("lunark-code-block")) return;

  const label = t("editor.copyCode");
  const wrap = doc.createElement("div");
  wrap.className = "lunark-code-block";

  const btn = doc.createElement("button");
  btn.type = "button";
  btn.className = "lunark-code-copy";
  btn.setAttribute("data-lunark-copy", "");
  btn.setAttribute("aria-label", label);
  btn.setAttribute("title", label);
  btn.textContent = t("help.copy");

  pre.replaceWith(wrap);
  wrap.appendChild(btn);
  wrap.appendChild(pre);
}

/** 去掉复制按钮并还原为裸 pre（Word / 印刷导出用）。纯字符串，便于 Node 单测。 */
export function stripCodeCopyChrome(html: string): string {
  if (!html.includes("lunark-code-block") && !html.includes("data-lunark-copy")) {
    return html;
  }
  let out = html.replace(
    /<button\b[^>]*\bdata-lunark-copy\b[^>]*(?:\/>|>[\s\S]*?<\/button>)/gi,
    "",
  );
  out = out.replace(
    /<div\b[^>]*\blunark-code-block\b[^>]*>\s*([\s\S]*?)\s*<\/div>/gi,
    "$1",
  );
  return out;
}

/**
 * 对 markdown-it 输出的 pre>code 做 Shiki / Mermaid 增强。
 */
export async function enhanceFencedBlocks(html: string): Promise<string> {
  if (!html.includes("<pre")) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="lunark-enhance">${html}</div>`,
    "text/html",
  );
  const root = doc.getElementById("lunark-enhance");
  if (!root) return html;

  const blocks = Array.from(root.querySelectorAll("pre > code"));

  await Promise.all(
    blocks.map(async (codeEl) => {
      const pre = codeEl.parentElement;
      if (!pre || pre.tagName !== "PRE") return;

      const classLang = langFromClass(codeEl.className);
      const { lang: cleanLang } = parseFenceInfo(classLang);
      const lang = cleanLang || classLang;
      const highlightLines = highlightLinesFromCodeEl(codeEl);
      const raw = decodeEntities(codeEl.textContent ?? "");

      if (lang.toLowerCase() === "mermaid") {
        const mode = useThemeStore().mermaidMode;
        const svg = await renderMermaidSvg(raw, mode);
        const wrap = doc.createElement("div");
        wrap.className = "mermaid-block";
        wrap.innerHTML = svg;
        pre.replaceWith(wrap);
        return;
      }

      let targetPre: Element = pre;
      const lineNumbers = useEditorStore().codeLineNumbers;

      if (lang) {
        try {
          const mode = useThemeStore().isDark ? "dark" : "light";
          const highlighted = await highlightCode(raw, lang, mode, {
            lineNumbers,
            highlightLines,
          });
          const temp = doc.createElement("div");
          temp.innerHTML = highlighted;
          const shikiPre = temp.querySelector("pre");
          if (shikiPre) {
            shikiPre.classList.add("shiki", "lunark-code");
            pre.replaceWith(shikiPre);
            targetPre = shikiPre;
          }
        } catch {
          /* keep original fence */
        }
      }

      wrapCodeBlockWithCopy(doc, targetPre);
    }),
  );

  return root.innerHTML;
}
