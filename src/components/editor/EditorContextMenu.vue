<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "@tauri-apps/api/core";
import { ElMessage } from "element-plus";
import { getFormatBridge } from "@/lib/editor/formatBridge";
import {
  containerSnippet,
  type ContainerKind,
} from "@/lib/markdown/containers";
import { EMOJI_CATALOG } from "@/lib/editor/emojiCatalog";
import { runEditorAiAction } from "@/lib/ai/runAiAction";
import type { AiAction } from "@/lib/ai/ollama";

type Submenu = "copyAs" | "paragraph" | "insert" | "ai" | "codeHl" | null;
type Nested = "containers" | "align" | "emoji" | null;

const { t } = useI18n();
const open = ref(false);
const x = ref(0);
const y = ref(0);
const submenu = ref<Submenu>(null);
const nested = ref<Nested>(null);
const subX = ref(0);
const subY = ref(0);
const nestX = ref(0);
const nestY = ref(0);
const subPanelRef = ref<HTMLElement | null>(null);
const nestPanelRef = ref<HTMLElement | null>(null);

const hasSelection = ref(false);
/** 光标在可高亮代码块内时显示「代码块」子菜单 */
const codeHlCtx = ref<{
  canSet: boolean;
  canClear: boolean;
  selectedLines: number[];
} | null>(null);
/** 飞出菜单关闭延迟，避免二三级之间空隙误关 */
let flyoutCloseTimer: ReturnType<typeof setTimeout> | null = null;

const menuStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
}));

const subStyle = computed(() => ({
  left: `${subX.value}px`,
  top: `${subY.value}px`,
}));

const nestStyle = computed(() => ({
  left: `${nestX.value}px`,
  top: `${nestY.value}px`,
}));

function bridge() {
  return getFormatBridge();
}

function cancelFlyoutClose() {
  if (flyoutCloseTimer) {
    clearTimeout(flyoutCloseTimer);
    flyoutCloseTimer = null;
  }
}

function close() {
  cancelFlyoutClose();
  open.value = false;
  submenu.value = null;
  nested.value = null;
}

function placeMenu(clientX: number, clientY: number) {
  const pad = 8;
  const mw = 260;
  const mh = 420;
  x.value = Math.min(clientX, window.innerWidth - mw - pad);
  y.value = Math.min(clientY, window.innerHeight - mh - pad);
  x.value = Math.max(pad, x.value);
  y.value = Math.max(pad, y.value);
}

function onContextMenu(e: MouseEvent) {
  const el = e.target as HTMLElement | null;
  if (!el) return;
  // 不抢 Crepe「+」/斜杠菜单自身的右键
  if (
    el.closest(".milkdown-slash-menu") ||
    el.closest(".milkdown-block-handle") ||
    el.closest("[data-milkdown-slash]")
  ) {
    return;
  }
  const inEditor =
    el.closest(".hybrid-editor") ||
    el.closest(".source-editor") ||
    el.closest(".cm-editor") ||
    el.closest(".ProseMirror");
  if (!inEditor) return;
  // 双栏预览区只读，不弹编辑菜单
  if (el.closest(".preview-pane") || el.closest(".markdown-preview")) return;
  if (!bridge()) return;

  e.preventDefault();
  e.stopPropagation();
  hasSelection.value = !!bridge()?.getSelectedText();
  const hl = bridge()?.inspectCodeBlockHighlight() ?? null;
  codeHlCtx.value =
    hl?.highlightable
      ? {
          canSet: hl.selectedLines.length > 0,
          canClear: hl.highlightLines.length > 0,
          selectedLines: hl.selectedLines,
        }
      : null;
  placeMenu(e.clientX, e.clientY);
  submenu.value = null;
  nested.value = null;
  open.value = true;
}

function run(fn: () => void) {
  try {
    fn();
  } finally {
    close();
  }
}

function runAi(action: AiAction) {
  void runEditorAiAction(action);
}

async function cut() {
  const b = bridge();
  if (!b) return;
  const text = b.getSelectedText();
  if (text) await navigator.clipboard.writeText(text);
  b.deleteSelection();
}

async function copy() {
  const b = bridge();
  if (!b) return;
  const text = b.getSelectedText();
  if (text) await navigator.clipboard.writeText(text);
}

async function paste() {
  const b = bridge();
  if (!b) return;
  try {
    const { clipboardToMarkdownTable } = await import("@/lib/editor/tablePaste");
    let html: string | null = null;
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes("text/html")) {
          html = await (await item.getType("text/html")).text();
          break;
        }
      }
    } catch {
      /* ignore */
    }
    const text = await navigator.clipboard.readText();
    const tableMd = clipboardToMarkdownTable(text, html);
    if (tableMd) {
      b.replaceSelection(tableMd.endsWith("\n") ? tableMd : `${tableMd}\n`);
      ElMessage.success(t("msg.tablePasted"));
      return;
    }
    if (text) b.replaceSelection(text);
  } catch {
    /* denied */
  }
}

function del() {
  bridge()?.deleteSelection();
}

async function copyAsMarkdown() {
  const b = bridge();
  if (!b) return;
  const text = b.getSelectedText() || "";
  await navigator.clipboard.writeText(text);
}

async function pasteAsPlain() {
  await paste();
}

async function searchGoogle() {
  const text = (bridge()?.getSelectedText() || "").trim();
  if (!text) return;
  const url = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
  if (isTauri()) {
    try {
      await openUrl(url);
      return;
    } catch {
      /* fallthrough */
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function bold() {
  bridge()?.toggleMark("strong");
}
function italic() {
  bridge()?.toggleMark("emphasis");
}
function code() {
  bridge()?.toggleMark("inlineCode");
}
function link() {
  bridge()?.toggleMark("link");
}
function quote() {
  bridge()?.runBlockAction("quote");
}
function ordered() {
  bridge()?.runBlockAction("orderedList");
}
function bullet() {
  bridge()?.runBlockAction("bulletList");
}
function task() {
  bridge()?.runBlockAction("taskList");
}

function heading(level: 0 | 1 | 2 | 3 | 4 | 5 | 6) {
  if (level === 0) {
    bridge()?.runBlockAction("paragraph");
    return;
  }
  const map = {
    1: "h1",
    2: "h2",
    3: "h3",
    4: "h4",
    5: "h5",
    6: "h6",
  } as const;
  bridge()?.runBlockAction(map[level]);
}

function insertImage() {
  void import("@/lib/editor/pickInsertImages").then((m) =>
    m.pickAndInsertImages(),
  );
}
function insertFootnote() {
  void import("@/lib/editor/insertFootnote").then((m) => m.insertFootnote());
}
function insertHr() {
  bridge()?.runBlockAction("hr");
}
function insertTable() {
  bridge()?.runBlockAction("table");
}
function insertCode() {
  bridge()?.runBlockAction("codeBlock");
}
function highlightSelectedCodeLines() {
  const lines = codeHlCtx.value?.selectedLines;
  if (!lines?.length) return;
  bridge()?.applyCodeBlockHighlight(lines);
}
function clearCodeLineHighlight() {
  bridge()?.applyCodeBlockHighlight(null);
}
function insertMath() {
  bridge()?.runBlockAction("math");
}
function insertToc() {
  bridge()?.insertSnippet("[TOC]");
}
function insertYaml() {
  bridge()?.insertSnippet("---\ntitle: \n---\n");
}
function insertContainer(kind: ContainerKind) {
  bridge()?.insertSnippet(containerSnippet(kind));
}
function insertEmoji(char: string) {
  bridge()?.insertSnippet(char);
}
function insertPara(where: "above" | "below") {
  bridge()?.insertSnippet(where === "above" ? "\n" : "\n\n");
}

/**
 * 贴齐锚点展开；水平优先贴右且保持与锚点重叠，避免空隙误关。
 * 垂直按预估高度夹进视口；渲染后再用真实高度二次校正。
 */
function placeFlyout(
  rect: DOMRect,
  width: number,
  estHeight: number,
  overlap = 2,
): { left: number; top: number } {
  const pad = 8;
  const maxH = Math.max(80, window.innerHeight - pad * 2);
  const h = Math.min(estHeight, maxH);
  const rightPos = rect.right - overlap;
  const leftPos = rect.left - width + overlap;
  const fitsRight = rightPos + width <= window.innerWidth - pad;
  const fitsLeft = leftPos >= pad;

  let left: number;
  if (fitsRight) left = rightPos;
  else if (fitsLeft) left = leftPos;
  else left = Math.max(pad, window.innerWidth - width - pad);

  let top = Math.min(rect.top, window.innerHeight - h - pad);
  top = Math.max(pad, top);
  return { left, top };
}

/** 按面板真实尺寸把飞出层夹回可视区域 */
function reclampPanel(
  el: HTMLElement | null,
  setLeft: (n: number) => void,
  setTop: (n: number) => void,
) {
  if (!el) return;
  const pad = 8;
  const r = el.getBoundingClientRect();
  let left = r.left;
  let top = r.top;
  if (r.bottom > window.innerHeight - pad) {
    top = Math.max(pad, window.innerHeight - r.height - pad);
  }
  if (r.top < pad) top = pad;
  if (r.right > window.innerWidth - pad) {
    left = Math.max(pad, window.innerWidth - r.width - pad);
  }
  if (r.left < pad) left = pad;
  if (left !== r.left) setLeft(left);
  if (top !== r.top) setTop(top);
}

function openSub(kind: Submenu, ev: MouseEvent) {
  cancelFlyoutClose();
  submenu.value = kind;
  nested.value = null;
  const el = ev.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  // insert 项多，预估偏小会先画出再被裁；用偏大值 + 实测校正
  const est =
    kind === "insert"
      ? 520
      : kind === "paragraph"
        ? 320
        : kind === "ai"
          ? 200
          : kind === "codeHl"
            ? 120
            : 140;
  const pos = placeFlyout(rect, 220, est, 4);
  subX.value = pos.left;
  subY.value = pos.top;
  void nextTick(() => {
    reclampPanel(subPanelRef.value, (n) => (subX.value = n), (n) => (subY.value = n));
  });
}

function openNested(kind: Nested, ev: MouseEvent) {
  cancelFlyoutClose();
  nested.value = kind;
  const row = ev.currentTarget as HTMLElement;
  const panel = row.closest(".ctx-sub") as HTMLElement | null;
  const rowRect = row.getBoundingClientRect();
  const panelRect = panel?.getBoundingClientRect() ?? rowRect;
  // 水平贴二级面板边，垂直对齐当前行；多重叠几像素当「桥」
  const anchor = new DOMRect(
    panelRect.left,
    rowRect.top,
    panelRect.width,
    rowRect.height,
  );
  const est =
    kind === "emoji" ? 320 : kind === "containers" ? 240 : 160;
  const width = kind === "emoji" ? 292 : 168;
  const pos = placeFlyout(anchor, width, est, kind === "emoji" ? 14 : 10);
  nestX.value = pos.left;
  nestY.value = pos.top;
  void nextTick(() => {
    reclampPanel(nestPanelRef.value, (n) => (nestX.value = n), (n) => (nestY.value = n));
  });
}

function onFlyoutEnter() {
  cancelFlyoutClose();
}

/** 移入同级/下级菜单时不关；离开后延迟关闭，方便穿过空隙 */
const FLYOUT_CLOSE_MS = 500;

function onFlyoutLeave(e: MouseEvent) {
  const to = e.relatedTarget as HTMLElement | null;
  if (
    to?.closest(".ctx-menu") ||
    to?.closest(".ctx-sub") ||
    to?.closest(".ctx-nest")
  ) {
    return;
  }
  cancelFlyoutClose();
  flyoutCloseTimer = setTimeout(() => {
    flyoutCloseTimer = null;
    submenu.value = null;
    nested.value = null;
  }, FLYOUT_CLOSE_MS);
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && open.value) {
    e.preventDefault();
    close();
  }
}

function onPointerDown(e: MouseEvent) {
  if (!open.value) return;
  const el = e.target as HTMLElement | null;
  if (
    el?.closest(".ctx-menu") ||
    el?.closest(".ctx-sub") ||
    el?.closest(".ctx-nest")
  ) {
    return;
  }
  close();
}

onMounted(() => {
  window.addEventListener("contextmenu", onContextMenu, true);
  window.addEventListener("keydown", onKey);
  window.addEventListener("mousedown", onPointerDown, true);
  window.addEventListener("blur", close);
});

onUnmounted(() => {
  cancelFlyoutClose();
  window.removeEventListener("contextmenu", onContextMenu, true);
  window.removeEventListener("keydown", onKey);
  window.removeEventListener("mousedown", onPointerDown, true);
  window.removeEventListener("blur", close);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="ctx-menu"
      :style="menuStyle"
      role="menu"
      @contextmenu.prevent
    >
      <button
        v-if="hasSelection"
        type="button"
        class="row"
        role="menuitem"
        @click="run(() => void searchGoogle())"
      >
        {{ t("editor.searchGoogle") }}
      </button>
      <div v-if="hasSelection" class="divider" />

      <div class="icon-row" role="group" :aria-label="t('editor.clipboardAria')">
        <button
          type="button"
          class="icon"
          :title="t('menu.cut')"
          @click="run(() => void cut())"
        >
          ✂
        </button>
        <button
          type="button"
          class="icon"
          :title="t('menu.copy')"
          @click="run(() => void copy())"
        >
          ⧉
        </button>
        <button
          type="button"
          class="icon"
          :title="t('menu.paste')"
          @click="run(() => void paste())"
        >
          📋
        </button>
        <button
          type="button"
          class="icon"
          :title="t('editor.delete')"
          @click="run(del)"
        >
          🗑
        </button>
      </div>

      <button
        type="button"
        class="row has-sub"
        role="menuitem"
        @mouseenter="openSub('copyAs', $event)"
        @click="openSub('copyAs', $event)"
      >
        {{ t("editor.copyPasteAs") }}
        <span class="arrow">›</span>
      </button>

      <div class="divider" />

      <div class="fmt-grid" role="group" :aria-label="t('editor.formatAria')">
        <button type="button" class="fmt" :title="t('editor.bold')" @click="run(bold)">
          <b>B</b>
        </button>
        <button type="button" class="fmt" :title="t('editor.italic')" @click="run(italic)">
          <i>I</i>
        </button>
        <button
          type="button"
          class="fmt mono"
          :title="t('editor.inlineCode')"
          @click="run(code)"
        >
          &lt;/&gt;
        </button>
        <button type="button" class="fmt" :title="t('editor.link')" @click="run(link)">
          🔗
        </button>
        <button type="button" class="fmt" :title="t('editor.quote')" @click="run(quote)">
          ❝
        </button>
        <button
          type="button"
          class="fmt"
          :title="t('editor.orderedList')"
          @click="run(ordered)"
        >
          1.
        </button>
        <button
          type="button"
          class="fmt"
          :title="t('editor.bulletList')"
          @click="run(bullet)"
        >
          •
        </button>
        <button type="button" class="fmt" :title="t('editor.taskList')" @click="run(task)">
          ☑
        </button>
      </div>

      <div class="divider" />

      <button
        v-if="codeHlCtx"
        type="button"
        class="row has-sub"
        role="menuitem"
        @mouseenter="openSub('codeHl', $event)"
        @click="openSub('codeHl', $event)"
      >
        {{ t("editor.codeBlock") }}
        <span class="arrow">›</span>
      </button>

      <button
        type="button"
        class="row has-sub"
        role="menuitem"
        @mouseenter="openSub('paragraph', $event)"
        @click="openSub('paragraph', $event)"
      >
        {{ t("editor.paragraph") }}
        <span class="arrow">›</span>
      </button>
      <button
        type="button"
        class="row has-sub"
        role="menuitem"
        @mouseenter="openSub('insert', $event)"
        @click="openSub('insert', $event)"
      >
        {{ t("editor.insert") }}
        <span class="arrow">›</span>
      </button>
      <button
        type="button"
        class="row has-sub"
        role="menuitem"
        @mouseenter="openSub('ai', $event)"
        @click="openSub('ai', $event)"
      >
        {{ t("editor.aiAssist") }}
        <span class="arrow">›</span>
      </button>
    </div>

    <div
      v-if="open && submenu === 'copyAs'"
      ref="subPanelRef"
      class="ctx-sub"
      :style="subStyle"
      role="menu"
      @mouseenter="onFlyoutEnter"
      @mouseleave="onFlyoutLeave"
    >
      <button type="button" class="row" @click="run(() => void copyAsMarkdown())">
        <span>{{ t("editor.copyAsMarkdown") }}</span>
        <kbd>Ctrl+Shift+C</kbd>
      </button>
      <button type="button" class="row" @click="run(() => void pasteAsPlain())">
        <span>{{ t("editor.pasteAsPlain") }}</span>
        <kbd>Ctrl+Shift+V</kbd>
      </button>
    </div>

    <div
      v-if="open && submenu === 'paragraph'"
      ref="subPanelRef"
      class="ctx-sub"
      :style="subStyle"
      role="menu"
      @mouseenter="onFlyoutEnter"
      @mouseleave="onFlyoutLeave"
    >
      <button
        v-for="lv in [1, 2, 3, 4, 5, 6] as const"
        :key="lv"
        type="button"
        class="row"
        @click="run(() => heading(lv))"
      >
        <span>{{ t("editor.headingLevel", { n: lv }) }}</span>
        <kbd>Ctrl+{{ lv }}</kbd>
      </button>
      <div class="divider" />
      <button type="button" class="row" @click="run(() => heading(0))">
        <span>{{ t("editor.paragraph") }}</span>
        <kbd>Ctrl+0</kbd>
      </button>
    </div>

    <div
      v-if="open && submenu === 'insert'"
      ref="subPanelRef"
      class="ctx-sub"
      :style="subStyle"
      role="menu"
      @mouseenter="onFlyoutEnter"
      @mouseleave="onFlyoutLeave"
    >
      <button
        type="button"
        class="row"
        @mouseenter="nested = null"
        @click="run(insertImage)"
      >
        <span>{{ t("editor.image") }}</span>
        <kbd>Ctrl+Shift+I</kbd>
      </button>
      <div class="divider" />
      <button
        type="button"
        class="row"
        @mouseenter="nested = null"
        @click="run(insertFootnote)"
      >
        {{ t("editor.footnote") }}
      </button>
      <div class="divider" />
      <button
        type="button"
        class="row has-sub"
        role="menuitem"
        @mouseenter="openNested('containers', $event)"
        @click="openNested('containers', $event)"
      >
        {{ t("editor.containerGroup") }}
        <span class="arrow">›</span>
      </button>
      <button
        type="button"
        class="row has-sub"
        role="menuitem"
        @mouseenter="openNested('align', $event)"
        @click="openNested('align', $event)"
      >
        {{ t("editor.alignGroup") }}
        <span class="arrow">›</span>
      </button>
      <button
        type="button"
        class="row has-sub"
        role="menuitem"
        @mouseenter="openNested('emoji', $event)"
        @click="openNested('emoji', $event)"
      >
        {{ t("editor.emoji") }}
        <span class="arrow">›</span>
      </button>
      <div class="divider" />
      <button
        type="button"
        class="row"
        @mouseenter="nested = null"
        @click="run(insertHr)"
      >
        {{ t("editor.hr") }}
      </button>
      <button
        type="button"
        class="row"
        @mouseenter="nested = null"
        @click="run(insertTable)"
      >
        <span>{{ t("editor.table") }}</span>
        <kbd>Ctrl+T</kbd>
      </button>
      <button
        type="button"
        class="row"
        @mouseenter="nested = null"
        @click="run(insertCode)"
      >
        <span>{{ t("editor.codeBlock") }}</span>
        <kbd>Ctrl+Shift+K</kbd>
      </button>
      <button
        type="button"
        class="row"
        @mouseenter="nested = null"
        @click="run(insertMath)"
      >
        <span>{{ t("editor.mathBlock") }}</span>
        <kbd>Ctrl+Shift+M</kbd>
      </button>
      <button
        type="button"
        class="row"
        @mouseenter="nested = null"
        @click="run(insertToc)"
      >
        {{ t("editor.toc") }}
      </button>
      <button
        type="button"
        class="row"
        @mouseenter="nested = null"
        @click="run(insertYaml)"
      >
        {{ t("editor.yamlFm") }}
      </button>
      <div class="divider" />
      <button
        type="button"
        class="row"
        @mouseenter="nested = null"
        @click="run(() => insertPara('above'))"
      >
        {{ t("editor.paraAbove") }}
      </button>
      <button
        type="button"
        class="row"
        @mouseenter="nested = null"
        @click="run(() => insertPara('below'))"
      >
        {{ t("editor.paraBelow") }}
      </button>
    </div>

    <div
      v-if="open && submenu === 'insert' && nested === 'containers'"
      ref="nestPanelRef"
      class="ctx-sub ctx-nest"
      :style="nestStyle"
      role="menu"
      @mouseenter="onFlyoutEnter"
      @mouseleave="onFlyoutLeave"
    >
      <button
        type="button"
        class="row"
        @click="run(() => insertContainer('tip'))"
      >
        {{ t("editor.containerTip") }}
      </button>
      <button
        type="button"
        class="row"
        @click="run(() => insertContainer('info'))"
      >
        {{ t("editor.containerInfo") }}
      </button>
      <button
        type="button"
        class="row"
        @click="run(() => insertContainer('warning'))"
      >
        {{ t("editor.containerWarning") }}
      </button>
      <button
        type="button"
        class="row"
        @click="run(() => insertContainer('danger'))"
      >
        {{ t("editor.containerDanger") }}
      </button>
      <button
        type="button"
        class="row"
        @click="run(() => insertContainer('details'))"
      >
        {{ t("editor.containerDetails") }}
      </button>
    </div>

    <div
      v-if="open && submenu === 'insert' && nested === 'align'"
      ref="nestPanelRef"
      class="ctx-sub ctx-nest"
      :style="nestStyle"
      role="menu"
      @mouseenter="onFlyoutEnter"
      @mouseleave="onFlyoutLeave"
    >
      <button
        type="button"
        class="row"
        @click="run(() => insertContainer('align-left'))"
      >
        {{ t("editor.alignLeft") }}
      </button>
      <button
        type="button"
        class="row"
        @click="run(() => insertContainer('align-center'))"
      >
        {{ t("editor.alignCenter") }}
      </button>
      <button
        type="button"
        class="row"
        @click="run(() => insertContainer('align-right'))"
      >
        {{ t("editor.alignRight") }}
      </button>
    </div>

    <div
      v-if="open && submenu === 'insert' && nested === 'emoji'"
      ref="nestPanelRef"
      class="ctx-sub ctx-nest ctx-emoji"
      :style="nestStyle"
      role="menu"
      @mouseenter="onFlyoutEnter"
      @mouseleave="onFlyoutLeave"
    >
      <div class="emoji-grid" role="group" :aria-label="t('editor.emoji')">
        <button
          v-for="e in EMOJI_CATALOG"
          :key="e.id"
          type="button"
          class="emoji-cell"
          :title="e.label"
          :aria-label="e.label"
          @click="run(() => insertEmoji(e.char))"
        >
          {{ e.char }}
        </button>
      </div>
    </div>

    <div
      v-if="open && submenu === 'codeHl'"
      ref="subPanelRef"
      class="ctx-sub"
      :style="subStyle"
      role="menu"
      @mouseenter="onFlyoutEnter"
      @mouseleave="onFlyoutLeave"
    >
      <button
        type="button"
        class="row"
        role="menuitem"
        :disabled="!codeHlCtx?.canSet"
        @click="run(highlightSelectedCodeLines)"
      >
        {{ t("editor.highlightSelectedLines") }}
      </button>
      <button
        type="button"
        class="row"
        role="menuitem"
        :disabled="!codeHlCtx?.canClear"
        @click="run(clearCodeLineHighlight)"
      >
        {{ t("editor.clearLineHighlight") }}
      </button>
    </div>

    <div
      v-if="open && submenu === 'ai'"
      ref="subPanelRef"
      class="ctx-sub"
      :style="subStyle"
      role="menu"
      @mouseenter="onFlyoutEnter"
      @mouseleave="onFlyoutLeave"
    >
      <button
        type="button"
        class="row"
        @click="run(() => void runAi('rewrite'))"
      >
        {{ t("editor.aiRewrite") }}
      </button>
      <button
        type="button"
        class="row"
        @click="run(() => void runAi('continue'))"
      >
        {{ t("editor.aiContinue") }}
      </button>
      <button
        type="button"
        class="row"
        @click="run(() => void runAi('translate'))"
      >
        {{ t("editor.aiTranslate") }}
      </button>
      <button
        type="button"
        class="row"
        @click="run(() => void runAi('summarize'))"
      >
        {{ t("editor.aiSummarize") }}
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.ctx-menu,
.ctx-sub {
  position: fixed;
  z-index: 10000;
  min-width: 220px;
  padding: 6px;
  background: #2e3238;
  border: 1px solid var(--border-color, #474d54);
  border-radius: 8px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  color: var(--text-color, #b8bfc6);
  font-size: 13px;
}

.ctx-sub {
  min-width: 210px;
  max-height: calc(100vh - 16px);
  overflow-x: hidden;
  overflow-y: auto;
}

.ctx-nest {
  z-index: 10001;
  min-width: 160px;
}

.ctx-emoji {
  min-width: 0;
  padding: 8px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 32px);
  gap: 2px;
}

.emoji-cell {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.emoji-cell:hover {
  background: rgba(112, 113, 125, 0.35);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  padding: 7px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 13px;
}

.row:hover:not(:disabled),
.row.has-sub:hover {
  background: rgba(112, 113, 125, 0.35);
}

.row:disabled {
  opacity: 0.4;
  cursor: default;
}

.arrow {
  opacity: 0.7;
  font-size: 16px;
  line-height: 1;
}

kbd {
  font-size: 11px;
  color: var(--control-text-color, #8b9198);
  font-family: inherit;
}

.divider {
  height: 1px;
  margin: 5px 4px;
  background: var(--border-color, #474d54);
}

.icon-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 2px 2px 6px;
}

.icon {
  border: 0;
  background: transparent;
  color: inherit;
  height: 32px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.icon:hover {
  background: rgba(112, 113, 125, 0.35);
}

.fmt-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 2px;
}

.fmt {
  border: 0;
  background: transparent;
  color: inherit;
  height: 32px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 13px;
}

.fmt.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
}

.fmt:hover {
  background: rgba(112, 113, 125, 0.35);
}
</style>
