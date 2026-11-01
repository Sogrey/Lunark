<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { dirname, isAbsolute, join } from "@tauri-apps/api/path";
import { isTauri } from "@tauri-apps/api/core";
import { ElMessage } from "element-plus";
import { useEditorStore } from "@/stores/editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { useThemeStore } from "@/stores/theme";
import { useDocumentActions } from "@/composables/useDocumentActions";
import { renderMarkdown } from "@/lib/markdown/renderer";
import { resolvePreviewImages } from "@/lib/markdown/images";
import { applyTocIdsToHtml, extractToc } from "@/lib/markdown/toc";
import {
  ACTIVE_HEADING_OFFSET_PX,
  resolveActiveHeadingId,
} from "@/lib/markdown/activeHeading";
import { clearMermaidCache } from "@/lib/markdown/mermaid";
import {
  previewBlockCache,
  splitPreviewBlocks,
} from "@/lib/markdown/previewCache";
import {
  resolveWikiTarget,
} from "@/lib/markdown/wikiLinks";
import { collectMarkdownPaths } from "@/lib/fs/workspaceSearch";

const { t } = useI18n();
const editor = useEditorStore();
const workspace = useWorkspaceStore();
const theme = useThemeStore();
const { openPathInTab } = useDocumentActions();
const html = ref("");
const pane = ref<HTMLElement | null>(null);
const lightboxSrc = ref<string | null>(null);
const lightboxAlt = ref("");

let timer: ReturnType<typeof setTimeout> | null = null;
let renderSeq = 0;

function scheduleRender(source: string, docPath: string | null) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void runRender(source, docPath);
  }, 160);
}

async function runRender(source: string, docPath: string | null) {
  const seq = ++renderSeq;
  const toc = extractToc(source);
  const blocks = splitPreviewBlocks(source);
  const parts = await Promise.all(
    blocks.map(async (block) => {
      const hit = previewBlockCache.get(block.key);
      if (hit !== undefined) return hit;
      const { html: piece } = await renderMarkdown(block.source);
      previewBlockCache.set(block.key, piece);
      return piece;
    }),
  );
  const rendered = parts.join("\n");
  const withIds = applyTocIdsToHtml(rendered, toc);
  const withAssets = await resolvePreviewImages(withIds, docPath);
  if (seq !== renderSeq) return;
  html.value = withAssets;
  void nextTick(() => updateActiveHeading());
}

function updateActiveHeading() {
  const root = pane.value;
  if (!root) {
    editor.setActiveHeadingId(null);
    return;
  }
  const write = root.querySelector("#write");
  if (!write) {
    editor.setActiveHeadingId(null);
    return;
  }
  const rootTop = root.getBoundingClientRect().top;
  const headings = Array.from(
    write.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]"),
  ).map((el) => ({
    id: el.id,
    top: el.getBoundingClientRect().top - rootTop,
  }));
  const next = resolveActiveHeadingId(headings, ACTIVE_HEADING_OFFSET_PX);
  if (next !== editor.activeHeadingId) {
    editor.setActiveHeadingId(next);
  }
}

function onPreviewScroll() {
  updateActiveHeading();
}

watch(
  () => [editor.content, editor.filePath] as const,
  ([value, path]) => scheduleRender(value, path),
  { immediate: true },
);

/** 主题明暗 / 行号开关变化时重渲代码块 / Mermaid */
watch(
  () => [theme.themeId, theme.isDark, editor.codeLineNumbers] as const,
  () => {
    clearMermaidCache();
    previewBlockCache.clear();
    scheduleRender(editor.content, editor.filePath);
  },
);

function isMarkdownHref(href: string): boolean {
  return /\.(md|markdown|mdown|mkd)(?:#.*)?$/i.test(href);
}

async function resolveLocalPath(href: string): Promise<string | null> {
  if (!isTauri()) return null;
  let decoded = href.trim();
  try {
    decoded = decodeURI(decoded);
  } catch {
    /* keep raw */
  }
  if (/^(https?:|mailto:|data:|blob:|#)/i.test(decoded)) return null;

  try {
    if (await isAbsolute(decoded)) return decoded;
    if (editor.filePath) {
      const dir = await dirname(editor.filePath);
      return await join(dir, decoded);
    }
    if (workspace.rootPath) {
      return await join(workspace.rootPath, decoded);
    }
  } catch {
    return null;
  }
  return null;
}

function openLightbox(img: HTMLImageElement) {
  const src = img.currentSrc || img.getAttribute("src") || "";
  if (!src) return;
  lightboxSrc.value = src;
  lightboxAlt.value = img.alt || "";
}

function closeLightbox() {
  lightboxSrc.value = null;
  lightboxAlt.value = "";
}

function onLightboxKey(e: KeyboardEvent) {
  if (e.key === "Escape" && lightboxSrc.value) {
    e.preventDefault();
    e.stopPropagation();
    closeLightbox();
  }
}

async function onPreviewClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;

  const img = target?.closest?.("img") as HTMLImageElement | null;
  if (img && pane.value?.contains(img)) {
    event.preventDefault();
    event.stopPropagation();
    openLightbox(img);
    return;
  }

  const copyBtn = target?.closest?.(
    "[data-lunark-copy]",
  ) as HTMLButtonElement | null;
  if (copyBtn) {
    event.preventDefault();
    event.stopPropagation();
    const block = copyBtn.closest(".lunark-code-block");
    const pre = block?.querySelector(":scope > pre");
    const text = pre?.textContent ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const prev = copyBtn.textContent;
      copyBtn.textContent = t("help.copied");
      copyBtn.classList.add("is-copied");
      window.setTimeout(() => {
        copyBtn.textContent = prev || t("help.copy");
        copyBtn.classList.remove("is-copied");
      }, 1200);
    } catch {
      ElMessage.warning(t("msg.copyFail"));
    }
    return;
  }

  const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
  if (!anchor) return;

  const href = anchor.getAttribute("href");
  if (!href) return;

  // 页内锚点
  if (href.startsWith("#")) {
    event.preventDefault();
    const el = document.getElementById(decodeURIComponent(href.slice(1)));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (href.startsWith("wikilink:")) {
    event.preventDefault();
    let target = href.slice("wikilink:".length);
    try {
      target = decodeURIComponent(target);
    } catch {
      /* keep */
    }
    const paths = collectMarkdownPaths(workspace.tree);
    const resolved = resolveWikiTarget(target, paths);
    if (resolved) {
      await openPathInTab(resolved);
    } else {
      ElMessage.info(t("msg.wikiNotFound", { name: target }));
    }
    return;
  }

  if (/^https?:\/\//i.test(href)) {
    event.preventDefault();
    try {
      await openUrl(href);
    } catch {
      window.open(href, "_blank", "noopener,noreferrer");
    }
    return;
  }

  if (/^mailto:/i.test(href)) {
    event.preventDefault();
    try {
      await openUrl(href);
    } catch {
      ElMessage.info(t("msg.mailOpenFail"));
    }
    return;
  }

  // 本地相对 / 绝对路径：md 开 Tab，其它用系统打开
  event.preventDefault();
  const local = await resolveLocalPath(href);
  if (!local) {
    ElMessage.info(t("msg.linkParseFail"));
    return;
  }

  if (isMarkdownHref(local) || isMarkdownHref(href)) {
    await openPathInTab(local.replace(/#.*$/, ""));
    return;
  }

  try {
    await openPath(local);
  } catch {
    ElMessage.warning(t("msg.cannotOpen", { path: local }));
  }
}

onMounted(() => {
  clearMermaidCache();
  editor.setPreviewEl(pane.value);
  pane.value?.addEventListener("scroll", onPreviewScroll, { passive: true });
  window.addEventListener("keydown", onLightboxKey, true);
  void nextTick(() => updateActiveHeading());
});

watch(pane, (el, prev) => {
  prev?.removeEventListener("scroll", onPreviewScroll);
  editor.setPreviewEl(el);
  el?.addEventListener("scroll", onPreviewScroll, { passive: true });
  void nextTick(() => updateActiveHeading());
});

onBeforeUnmount(() => {
  pane.value?.removeEventListener("scroll", onPreviewScroll);
  window.removeEventListener("keydown", onLightboxKey, true);
  closeLightbox();
  editor.setPreviewEl(null);
});

const empty = computed(() => !editor.content.trim());
</script>

<template>
  <div ref="pane" class="preview-pane" @click="onPreviewClick">
    <div v-if="empty" class="preview-empty">{{ t("editor.previewEmpty") }}</div>
    <article
      v-else
      id="write"
      class="markdown-preview"
      v-html="html"
    />
  </div>

  <Teleport to="body">
    <div
      v-if="lightboxSrc"
      class="img-lightbox"
      role="dialog"
      :aria-label="t('editor.imageLightbox')"
      @click.self="closeLightbox"
    >
      <button
        type="button"
        class="img-lightbox-close"
        :title="t('help.close')"
        :aria-label="t('help.close')"
        @click="closeLightbox"
      >
        ×
      </button>
      <img
        class="img-lightbox-photo"
        :src="lightboxSrc"
        :alt="lightboxAlt"
        @click.stop
      />
    </div>
  </Teleport>
</template>

<style scoped>
.preview-pane {
  height: 100%;
  overflow: auto;
  background: var(--bg-color);
  border-left: 1px solid var(--border-color);
}

.preview-empty {
  padding: 2.5rem;
  color: var(--focus-dim-color);
  font-size: 0.95rem;
}

.preview-pane :deep(.markdown-preview img) {
  max-width: 100%;
  cursor: zoom-in;
}

.preview-pane :deep(.markdown-preview img:not([height])) {
  height: auto;
}

.img-lightbox {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.72);
  cursor: zoom-out;
}

.img-lightbox-photo {
  max-width: min(96vw, 1400px);
  max-height: 92vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  cursor: default;
}

.img-lightbox-close {
  position: absolute;
  top: 12px;
  right: 14px;
  z-index: 1;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.img-lightbox-close:hover {
  background: rgba(255, 255, 255, 0.22);
}

.preview-pane :deep(.markdown-preview .task-list-item input) {
  pointer-events: none;
  opacity: 0.85;
}

.preview-pane :deep(.markdown-preview h1),
.preview-pane :deep(.markdown-preview h2),
.preview-pane :deep(.markdown-preview h3),
.preview-pane :deep(.markdown-preview h4),
.preview-pane :deep(.markdown-preview h5),
.preview-pane :deep(.markdown-preview h6) {
  scroll-margin-top: 12px;
}
</style>
