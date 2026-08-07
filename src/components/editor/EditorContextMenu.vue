<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "@tauri-apps/api/core";
import { getFormatBridge } from "@/lib/editor/formatBridge";

type Submenu = "copyAs" | "paragraph" | "insert" | null;

const open = ref(false);
const x = ref(0);
const y = ref(0);
const submenu = ref<Submenu>(null);
const subX = ref(0);
const subY = ref(0);

const hasSelection = ref(false);

const menuStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
}));

const subStyle = computed(() => ({
  left: `${subX.value}px`,
  top: `${subY.value}px`,
}));

function bridge() {
  return getFormatBridge();
}

function close() {
  open.value = false;
  submenu.value = null;
}

function placeMenu(clientX: number, clientY: number) {
  const pad = 8;
  const mw = 260;
  const mh = 320;
  x.value = Math.min(clientX, window.innerWidth - mw - pad);
  y.value = Math.min(clientY, window.innerHeight - mh - pad);
  x.value = Math.max(pad, x.value);
  y.value = Math.max(pad, y.value);
}

function onContextMenu(e: MouseEvent) {
  const t = e.target as HTMLElement | null;
  if (!t) return;
  // 不抢 Crepe「+」/斜杠菜单自身的右键
  if (
    t.closest(".milkdown-slash-menu") ||
    t.closest(".milkdown-block-handle") ||
    t.closest("[data-milkdown-slash]")
  ) {
    return;
  }
  const inEditor =
    t.closest(".hybrid-editor") ||
    t.closest(".source-editor") ||
    t.closest(".cm-editor") ||
    t.closest(".ProseMirror");
  if (!inEditor) return;
  // 双栏预览区只读，不弹编辑菜单
  if (t.closest(".preview-pane") || t.closest(".markdown-preview")) return;
  if (!bridge()) return;

  e.preventDefault();
  e.stopPropagation();
  hasSelection.value = !!bridge()?.getSelectedText();
  placeMenu(e.clientX, e.clientY);
  submenu.value = null;
  open.value = true;
}

function run(fn: () => void) {
  try {
    fn();
  } finally {
    close();
  }
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
    const text = await navigator.clipboard.readText();
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
  bridge()?.runBlockAction("image");
}
function insertFootnote() {
  bridge()?.insertSnippet("[^1]\n\n[^1]: 脚注内容");
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
function insertMath() {
  bridge()?.runBlockAction("math");
}
function insertToc() {
  bridge()?.insertSnippet("[TOC]");
}
function insertYaml() {
  bridge()?.insertSnippet("---\ntitle: \n---\n");
}
function insertPara(where: "above" | "below") {
  bridge()?.insertSnippet(where === "above" ? "\n" : "\n\n");
}

function openSub(kind: Submenu, ev: MouseEvent) {
  submenu.value = kind;
  const el = ev.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  const sw = 220;
  let left = rect.right + 4;
  if (left + sw > window.innerWidth - 8) left = rect.left - sw - 4;
  subX.value = Math.max(8, left);
  subY.value = Math.max(8, Math.min(rect.top, window.innerHeight - 280));
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && open.value) {
    e.preventDefault();
    close();
  }
}

function onPointerDown(e: MouseEvent) {
  if (!open.value) return;
  const t = e.target as HTMLElement | null;
  if (t?.closest(".ctx-menu") || t?.closest(".ctx-sub")) return;
  close();
}

onMounted(() => {
  window.addEventListener("contextmenu", onContextMenu, true);
  window.addEventListener("keydown", onKey);
  window.addEventListener("mousedown", onPointerDown, true);
  window.addEventListener("blur", close);
});

onUnmounted(() => {
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
        使用 Google 搜索
      </button>
      <div v-if="hasSelection" class="divider" />

      <div class="icon-row" role="group" aria-label="剪贴板">
        <button type="button" class="icon" title="剪切" @click="run(() => void cut())">
          ✂
        </button>
        <button type="button" class="icon" title="复制" @click="run(() => void copy())">
          ⧉
        </button>
        <button type="button" class="icon" title="粘贴" @click="run(() => void paste())">
          📋
        </button>
        <button type="button" class="icon" title="删除" @click="run(del)">
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
        复制 / 粘贴为…
        <span class="arrow">›</span>
      </button>

      <div class="divider" />

      <div class="fmt-grid" role="group" aria-label="格式">
        <button type="button" class="fmt" title="粗体" @click="run(bold)"><b>B</b></button>
        <button type="button" class="fmt" title="斜体" @click="run(italic)"><i>I</i></button>
        <button type="button" class="fmt mono" title="行内代码" @click="run(code)">&lt;/&gt;</button>
        <button type="button" class="fmt" title="链接" @click="run(link)">🔗</button>
        <button type="button" class="fmt" title="引用" @click="run(quote)">❝</button>
        <button type="button" class="fmt" title="有序列表" @click="run(ordered)">1.</button>
        <button type="button" class="fmt" title="无序列表" @click="run(bullet)">•</button>
        <button type="button" class="fmt" title="任务列表" @click="run(task)">☑</button>
      </div>

      <div class="divider" />

      <button
        type="button"
        class="row has-sub"
        role="menuitem"
        @mouseenter="openSub('paragraph', $event)"
        @click="openSub('paragraph', $event)"
      >
        段落
        <span class="arrow">›</span>
      </button>
      <button
        type="button"
        class="row has-sub"
        role="menuitem"
        @mouseenter="openSub('insert', $event)"
        @click="openSub('insert', $event)"
      >
        插入
        <span class="arrow">›</span>
      </button>
    </div>

    <div
      v-if="open && submenu === 'copyAs'"
      class="ctx-sub"
      :style="subStyle"
      role="menu"
      @mouseleave="submenu = null"
    >
      <button type="button" class="row" @click="run(() => void copyAsMarkdown())">
        <span>复制为 Markdown</span>
        <kbd>Ctrl+Shift+C</kbd>
      </button>
      <button type="button" class="row" @click="run(() => void pasteAsPlain())">
        <span>粘贴为纯文本</span>
        <kbd>Ctrl+Shift+V</kbd>
      </button>
    </div>

    <div
      v-if="open && submenu === 'paragraph'"
      class="ctx-sub"
      :style="subStyle"
      role="menu"
      @mouseleave="submenu = null"
    >
      <button
        v-for="lv in [1, 2, 3, 4, 5, 6] as const"
        :key="lv"
        type="button"
        class="row"
        @click="run(() => heading(lv))"
      >
        <span>{{ lv }} 级标题</span>
        <kbd>Ctrl+{{ lv }}</kbd>
      </button>
      <div class="divider" />
      <button type="button" class="row" @click="run(() => heading(0))">
        <span>段落</span>
        <kbd>Ctrl+0</kbd>
      </button>
    </div>

    <div
      v-if="open && submenu === 'insert'"
      class="ctx-sub"
      :style="subStyle"
      role="menu"
      @mouseleave="submenu = null"
    >
      <button type="button" class="row" @click="run(insertImage)">
        <span>图像</span>
        <kbd>Ctrl+Shift+I</kbd>
      </button>
      <div class="divider" />
      <button type="button" class="row" @click="run(insertFootnote)">脚注</button>
      <button type="button" class="row" @click="run(insertHr)">水平分割线</button>
      <button type="button" class="row" @click="run(insertTable)">
        <span>表格</span>
        <kbd>Ctrl+T</kbd>
      </button>
      <button type="button" class="row" @click="run(insertCode)">
        <span>代码块</span>
        <kbd>Ctrl+Shift+K</kbd>
      </button>
      <button type="button" class="row" @click="run(insertMath)">
        <span>公式块</span>
        <kbd>Ctrl+Shift+M</kbd>
      </button>
      <button type="button" class="row" @click="run(insertToc)">内容目录</button>
      <button type="button" class="row" @click="run(insertYaml)">YAML Front Matter</button>
      <div class="divider" />
      <button type="button" class="row" @click="run(() => insertPara('above'))">
        段落（上方）
      </button>
      <button type="button" class="row" @click="run(() => insertPara('below'))">
        段落（下方）
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
  max-height: min(70vh, 420px);
  overflow: auto;
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

.row:hover,
.row.has-sub:hover {
  background: rgba(112, 113, 125, 0.35);
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
