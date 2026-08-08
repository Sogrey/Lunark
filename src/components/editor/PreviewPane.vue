<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
import { clearMermaidCache } from "@/lib/markdown/mermaid";

const { t } = useI18n();
const editor = useEditorStore();
const workspace = useWorkspaceStore();
const theme = useThemeStore();
const { openPathInTab } = useDocumentActions();
const html = ref("");
const pane = ref<HTMLElement | null>(null);

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
  const { html: rendered } = await renderMarkdown(source);
  const withIds = applyTocIdsToHtml(rendered, toc);
  const withAssets = await resolvePreviewImages(withIds, docPath);
  if (seq !== renderSeq) return;
  html.value = withAssets;
}

watch(
  () => [editor.content, editor.filePath] as const,
  ([value, path]) => scheduleRender(value, path),
  { immediate: true },
);

/** 主题明暗变化时重渲代码块 / Mermaid */
watch(
  () => [theme.themeId, theme.isDark] as const,
  () => {
    clearMermaidCache();
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

async function onPreviewClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
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
});

watch(pane, (el) => {
  editor.setPreviewEl(el);
});

onBeforeUnmount(() => {
  editor.setPreviewEl(null);
});

const empty = computed(() => !editor.content.trim());
</script>

<template>
  <div ref="pane" class="preview-pane" @click="onPreviewClick">
    <div v-if="empty" class="preview-empty">{{ t("editor.previewEmpty") }}</div>
    <article
      v-else
      class="markdown-preview"
      v-html="html"
    />
  </div>
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
  height: auto;
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
