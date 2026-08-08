import { highlightCode } from "@/lib/markdown/shiki";
import { renderMermaidSvg } from "@/lib/markdown/mermaid";
import { useThemeStore } from "@/stores/theme";

function decodeEntities(text: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

function langFromClass(className: string): string {
  const match = /(?:^|\s)language-([^\s]+)/.exec(className);
  return match?.[1] ?? "";
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

      const lang = langFromClass(codeEl.className);
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

      if (!lang) return;

      try {
        const mode = useThemeStore().isDark ? "dark" : "light";
        const highlighted = await highlightCode(raw, lang, mode);
        const temp = doc.createElement("div");
        temp.innerHTML = highlighted;
        const shikiPre = temp.querySelector("pre");
        if (shikiPre) {
          shikiPre.classList.add("shiki", "lunark-code");
          pre.replaceWith(shikiPre);
        }
      } catch {
        /* keep original fence */
      }
    }),
  );

  return root.innerHTML;
}
