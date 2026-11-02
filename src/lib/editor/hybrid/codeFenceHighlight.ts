/**
 * 混合编辑代码块：把围栏 info 里的 `{1,3-5}` 画成行高亮（区别于光标行）。
 * 行号 gutter 同步上色；language 为 `ts{2}` 时补载干净语言语法。
 */
import { languages } from "@codemirror/language-data";
import { LanguageDescription } from "@codemirror/language";
import {
  Compartment,
  RangeSet,
  StateEffect,
  StateField,
  type Extension,
  type Range,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  GutterMarker,
  highlightActiveLineGutter,
  lineNumberMarkers,
  lineNumbers,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import {
  formatHighlightRanges,
  parseFenceInfo,
} from "@/lib/markdown/fenceInfo";

const fenceLangConf = new Compartment();

const hlGutterMarker = new (class extends GutterMarker {
  elementClass = "cm-lunark-hl-gutter";
})();

const setHlGutters = StateEffect.define<RangeSet<GutterMarker>>();

const hlGutterField = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setHlGutters)) return e.value;
    }
    if (tr.docChanged) return value.map(tr.changes);
    return value;
  },
  provide: (field) => lineNumberMarkers.from(field),
});

function readFenceLanguage(view: EditorView): string {
  const host = view.dom.closest(".milkdown-code-block");
  if (!host) return "";
  const btn = host.querySelector(".language-button");
  const raw = (btn?.textContent ?? host.getAttribute("data-language") ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const m = /([A-Za-z0-9#+._-]*)(\{[\d,\s-]+\})/.exec(raw);
  if (m) return `${m[1] ?? ""}${m[2] ?? ""}`;
  return raw;
}

function buildHighlightSets(view: EditorView): {
  lines: DecorationSet;
  gutters: RangeSet<GutterMarker>;
} {
  const { highlightLines } = parseFenceInfo(readFenceLanguage(view));
  if (highlightLines.length === 0) {
    return { lines: Decoration.none, gutters: RangeSet.empty };
  }
  const want = new Set(highlightLines);
  const lineDecos: Range<Decoration>[] = [];
  const gutterMarks: Range<GutterMarker>[] = [];
  for (const range of view.visibleRanges) {
    let pos = range.from;
    while (pos <= range.to) {
      const line = view.state.doc.lineAt(pos);
      if (want.has(line.number)) {
        lineDecos.push(
          Decoration.line({ class: "cm-lunark-hl-line" }).range(line.from),
        );
        gutterMarks.push(hlGutterMarker.range(line.from));
      }
      pos = line.to + 1;
    }
  }
  return {
    lines: Decoration.set(lineDecos),
    gutters: RangeSet.of(gutterMarks, true),
  };
}

async function loadCleanLanguageSupport(lang: string) {
  const key = lang.trim();
  if (!key) return null;
  const desc =
    LanguageDescription.matchLanguageName(languages, key, true) ??
    languages.find(
      (l) =>
        l.name.toLowerCase() === key.toLowerCase() ||
        l.alias.some((a) => a.toLowerCase() === key.toLowerCase()),
    );
  if (!desc) return null;
  try {
    return await desc.load();
  } catch {
    return null;
  }
}

const fenceHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    private mo: MutationObserver | null = null;
    private lastFence = "";
    private lastLangKey = "";
    private lastGutterKey = "";
    private attached = false;
    private syncing = false;

    constructor(view: EditorView) {
      this.decorations = buildHighlightSets(view).lines;
      this.lastFence = readFenceLanguage(view);
      this.tryAttach(view);
      queueMicrotask(() => {
        this.tryAttach(view);
        this.refresh(view, true);
      });
    }

    update(u: ViewUpdate) {
      this.tryAttach(u.view);
      if (
        u.docChanged ||
        u.viewportChanged ||
        u.transactions.some((tr) => tr.isUserEvent("lunark.fence-hl")) ||
        readFenceLanguage(u.view) !== this.lastFence
      ) {
        this.refresh(u.view, false);
      }
    }

    destroy() {
      this.mo?.disconnect();
      this.mo = null;
    }

    private tryAttach(view: EditorView) {
      if (this.attached) return;
      const host = view.dom.closest(".milkdown-code-block");
      if (!host) return;
      this.attached = true;
      this.mo = new MutationObserver(() => {
        const fence = readFenceLanguage(view);
        if (fence === this.lastFence) return;
        this.refresh(view, true);
        if (!this.syncing) {
          this.syncing = true;
          view.dispatch({ userEvent: "lunark.fence-hl" });
          this.syncing = false;
        }
      });
      this.mo.observe(host, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });
      this.refresh(view, true);
    }

    private refresh(view: EditorView, syncLang: boolean) {
      const fence = readFenceLanguage(view);
      this.lastFence = fence;
      const sets = buildHighlightSets(view);
      this.decorations = sets.lines;

      const gutterKey = `${fence}|${sets.gutters.size}`;
      if (gutterKey !== this.lastGutterKey && !this.syncing) {
        this.lastGutterKey = gutterKey;
        this.syncing = true;
        view.dispatch({
          effects: setHlGutters.of(sets.gutters),
          userEvent: "lunark.fence-hl",
        });
        this.syncing = false;
      }

      if (syncLang) void this.syncFenceLanguage(view, fence);
    }

    private async syncFenceLanguage(view: EditorView, fence: string) {
      const { lang, highlightLines } = parseFenceInfo(fence);
      if (highlightLines.length === 0) {
        if (this.lastLangKey !== "") {
          this.lastLangKey = "";
          view.dispatch({
            effects: fenceLangConf.reconfigure([]),
          });
        }
        return;
      }
      const key = lang.toLowerCase();
      if (key === this.lastLangKey) return;
      this.lastLangKey = key;
      const support = await loadCleanLanguageSupport(lang);
      if (!view.dom.isConnected) return;
      view.dispatch({
        effects: fenceLangConf.reconfigure(support ? [support] : []),
      });
    }
  },
  { decorations: (v) => v.decorations },
);

const fenceHighlightTheme = EditorView.baseTheme({
  "& .cm-gutters": {
    borderRight: "none",
    backgroundColor: "transparent",
  },
  "& .cm-foldGutter": {
    display: "none",
    width: "0",
  },
  "& .cm-content": {
    paddingLeft: "0",
  },
  /* GitHub 风：一条底色向左盖住行号，无左边细线 */
  "& .cm-line.cm-lunark-hl-line": {
    backgroundColor:
      "color-mix(in srgb, #6dc1e7 28%, transparent) !important",
    boxShadow:
      "-4.5em 0 0 color-mix(in srgb, #6dc1e7 28%, transparent) !important",
  },
  "& .cm-gutters .cm-lunark-hl-gutter": {
    backgroundColor: "transparent !important",
    color: "var(--text-color, #d0d6dc)",
  },
  "&light .cm-line.cm-lunark-hl-line": {
    backgroundColor:
      "color-mix(in srgb, #0563c1 18%, transparent) !important",
    boxShadow:
      "-4.5em 0 0 color-mix(in srgb, #0563c1 18%, transparent) !important",
  },
});

/** 挂到 Crepe CodeMirror `extensions`（显式行号 + 高亮） */
export function lunarkCodeFenceHighlightExtensions(): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    hlGutterField,
    fenceLangConf.of([]),
    fenceHighlightTheme,
    fenceHighlightPlugin,
  ];
}

/** 语言按钮展示 */
export function renderFenceAwareLanguage(
  language: string,
  _selected: boolean,
): string {
  const { lang, highlightLines } = parseFenceInfo(language);
  const spec = formatHighlightRanges(highlightLines);
  const base = lang || language || "Text";
  return spec ? `${base}{${spec}}` : base;
}
