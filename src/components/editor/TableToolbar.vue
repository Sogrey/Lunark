<script setup lang="ts">
/**
 * 光标在表格内时，浮于表格上方的操作条（对齐 / 更多 / 删除）。
 */
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useEditorStore } from "@/stores/editor";
import {
  applyTableToDoc,
  cellColumnFromDom,
  estimateColIndex,
  findTableAtLine,
  formatTable,
  getColumnAlign,
  insertColumn,
  insertRow,
  moveColumn,
  moveRow,
  setColumnAlign,
  type ColAlign,
  type MdTableBlock,
  deleteColumn,
} from "@/lib/editor/mdTable";

const editor = useEditorStore();

const visible = ref(false);
const top = ref(0);
const left = ref(0);
const width = ref(0);
const col = ref(0);
const align = ref<ColAlign>("none");
const menuOpen = ref(false);
const tableRef = ref<MdTableBlock | null>(null);
const rowIndex = ref(2);

const alignLeft = computed(() => align.value === "left" || align.value === "none");
const alignCenter = computed(() => align.value === "center");
const alignRight = computed(() => align.value === "right");

function splitLines(doc: string) {
  return doc.split(/\r\n|\r|\n/);
}

function resolveFromSource(): boolean {
  const view = editor.cmView;
  if (!view || editor.viewMode === "hybrid") return false;
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  const lineIndex = line.number - 1;
  const table = findTableAtLine(splitLines(view.state.doc.toString()), lineIndex);
  if (!table) return false;

  tableRef.value = table;
  col.value = estimateColIndex(line.text, head - line.from);
  align.value = getColumnAlign(table, col.value);
  rowIndex.value = Math.max(2, lineIndex - table.start);

  const coords = view.coordsAtPos(view.state.doc.line(table.start + 1).from);
  if (!coords) return false;
  const editorBox = view.scrollDOM.getBoundingClientRect();
  top.value = coords.top - 36;
  left.value = editorBox.left + 8;
  width.value = Math.max(200, editorBox.width - 16);
  return true;
}

function resolveFromHybrid(): boolean {
  if (editor.viewMode !== "hybrid") return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const node = sel.anchorNode;
  if (!node) return false;
  const el =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  const cell = el?.closest("td,th");
  const tableEl = cell?.closest("table");
  if (!cell || !tableEl) return false;
  if (!tableEl.closest(".hybrid-editor")) return false;

  col.value = cellColumnFromDom(cell);
  const rect = tableEl.getBoundingClientRect();
  top.value = rect.top - 36;
  left.value = rect.left;
  width.value = rect.width;

  const headerCells = Array.from(
    tableEl.querySelectorAll("tr:first-child th, tr:first-child td"),
  ).map((c) => c.textContent?.trim() ?? "");
  const lines = splitLines(editor.content);
  let found: MdTableBlock | null = null;
  for (let i = 0; i < lines.length; i++) {
    const t = findTableAtLine(lines, i);
    if (!t) continue;
    const head = t.lines[0] ?? "";
    if (headerCells.every((h) => !h || head.includes(h))) {
      found = t;
      break;
    }
  }
  if (!found) {
    // fallback: first table
    for (let i = 0; i < lines.length; i++) {
      found = findTableAtLine(lines, i);
      if (found) break;
    }
  }
  if (!found) return false;
  tableRef.value = found;
  align.value = getColumnAlign(found, col.value);
  const tr = cell.closest("tr");
  const rows = tableEl.querySelectorAll("tr");
  rowIndex.value = tr ? Math.max(2, Array.from(rows).indexOf(tr as HTMLTableRowElement) + 1) : 2;
  return true;
}

function refresh() {
  const ok =
    editor.viewMode === "hybrid" ? resolveFromHybrid() : resolveFromSource();
  // 离开表格时才关「更多」；刷新位置时保持菜单打开
  if (!ok) {
    menuOpen.value = false;
    tableRef.value = null;
  }
  visible.value = ok;
}

function commit(next: MdTableBlock | null, mode: "replace" | "delete" = "replace") {
  if (!tableRef.value && mode === "replace") return;
  const base = tableRef.value;
  const doc = applyTableToDoc(editor.content, mode === "delete" ? base : next ?? base, mode);
  editor.setContent(doc);
  requestAnimationFrame(refresh);
}

function setAlign(a: ColAlign) {
  if (!tableRef.value) return;
  const next = setColumnAlign(tableRef.value, col.value, a);
  align.value = a;
  commit(next);
}

function onInsertRow(where: "above" | "below") {
  if (!tableRef.value) return;
  const at = where === "above" ? rowIndex.value : rowIndex.value + 1;
  commit(insertRow(tableRef.value, Math.max(2, at)));
  menuOpen.value = false;
}

function onInsertCol(where: "left" | "right") {
  if (!tableRef.value) return;
  const at = where === "left" ? col.value : col.value + 1;
  commit(insertColumn(tableRef.value, at));
  menuOpen.value = false;
}

function onMoveRow(dir: -1 | 1) {
  if (!tableRef.value) return;
  const from = rowIndex.value;
  const to = from + dir;
  commit(moveRow(tableRef.value, from, to));
  menuOpen.value = false;
}

function onMoveCol(dir: -1 | 1) {
  if (!tableRef.value) return;
  commit(moveColumn(tableRef.value, col.value, col.value + dir));
  menuOpen.value = false;
}

function onDeleteCol() {
  if (!tableRef.value) return;
  const next = deleteColumn(tableRef.value, col.value);
  menuOpen.value = false;
  if (!next) {
    commit(null, "delete");
    return;
  }
  commit(next);
}

async function onCopyTable() {
  if (!tableRef.value) return;
  await navigator.clipboard.writeText(tableRef.value.lines.join("\n"));
  menuOpen.value = false;
}

function onFormat() {
  if (!tableRef.value) return;
  commit(formatTable(tableRef.value));
  menuOpen.value = false;
}

function onDeleteTable() {
  commit(null, "delete");
  visible.value = false;
}

function onDocClick(e: MouseEvent) {
  const t = e.target as Node | null;
  if (!t) return;
  const bar = document.querySelector(".table-toolbar");
  if (bar?.contains(t)) return;
  refresh();
}

onMounted(() => {
  document.addEventListener("selectionchange", refresh);
  document.addEventListener("keyup", refresh);
  document.addEventListener("mouseup", refresh);
  document.addEventListener("click", onDocClick);
  window.addEventListener("resize", refresh);
  window.addEventListener("scroll", refresh, true);
});

onUnmounted(() => {
  document.removeEventListener("selectionchange", refresh);
  document.removeEventListener("keyup", refresh);
  document.removeEventListener("mouseup", refresh);
  document.removeEventListener("click", onDocClick);
  window.removeEventListener("resize", refresh);
  window.removeEventListener("scroll", refresh, true);
});

watch(
  () => [editor.viewMode, editor.content, editor.cmView] as const,
  () => refresh(),
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="table-toolbar"
      :style="{ top: `${top}px`, left: `${left}px`, width: `${width}px` }"
      @mousedown.prevent
    >
      <div class="left">
        <span class="hint" title="表格">▦</span>
        <button
          type="button"
          class="icon align"
          :class="{ active: alignLeft }"
          title="左对齐"
          @click="setAlign('left')"
        >
          <span class="align-ico left" />
        </button>
        <button
          type="button"
          class="icon align"
          :class="{ active: alignCenter }"
          title="居中"
          @click="setAlign('center')"
        >
          <span class="align-ico center" />
        </button>
        <button
          type="button"
          class="icon align"
          :class="{ active: alignRight }"
          title="右对齐"
          @click="setAlign('right')"
        >
          <span class="align-ico right" />
        </button>
      </div>

      <div class="right">
        <div class="more-wrap">
          <button
            type="button"
            class="more"
            title="更多操作"
            :aria-expanded="menuOpen"
            @click.stop="menuOpen = !menuOpen"
          >
            更多操作 ⋮
          </button>
          <div v-if="menuOpen" class="menu" role="menu">
            <button type="button" @click="onInsertRow('above')">上方插入行</button>
            <button type="button" @click="onInsertRow('below')">
              下方插入行 <kbd>Ctrl+Enter</kbd>
            </button>
            <button type="button" @click="onInsertCol('left')">左侧插入列</button>
            <button type="button" @click="onInsertCol('right')">右侧插入列</button>
            <div class="sep" />
            <button type="button" @click="onMoveRow(-1)">上移该行 <kbd>Alt+↑</kbd></button>
            <button type="button" @click="onMoveRow(1)">下移该行 <kbd>Alt+↓</kbd></button>
            <button type="button" @click="onMoveCol(-1)">左移该列 <kbd>Alt+←</kbd></button>
            <button type="button" @click="onMoveCol(1)">右移该列 <kbd>Alt+→</kbd></button>
            <div class="sep" />
            <button type="button" @click="onDeleteCol">删除列</button>
            <button type="button" @click="onCopyTable">复制表格</button>
            <button type="button" @click="onFormat">格式化表格源码</button>
            <div class="sep" />
            <button type="button" class="danger" @click="onDeleteTable">删除表格</button>
          </div>
        </div>
        <button
          type="button"
          class="icon danger"
          title="删除表格"
          @click="onDeleteTable"
        >
          🗑
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.table-toolbar {
  position: fixed;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 6px;
  box-sizing: border-box;
  background: #2a2e33;
  border: 1px solid var(--border-color, #474d54);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
}

.left,
.right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.hint {
  color: var(--control-text-color, #8b9198);
  font-size: 12px;
  padding: 0 4px;
}

.icon,
.more {
  border: 0;
  background: transparent;
  color: var(--text-color, #b8bfc6);
  height: 26px;
  min-width: 26px;
  padding: 0 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.icon:hover,
.more:hover {
  background: rgba(112, 113, 125, 0.35);
}

.icon.active {
  outline: 1px solid #fff;
  outline-offset: -1px;
  color: #fff;
}

.align-ico {
  display: block;
  width: 12px;
  height: 10px;
  background:
    linear-gradient(currentColor, currentColor) 0 0 / 100% 2px no-repeat,
    linear-gradient(currentColor, currentColor) 0 4px / 70% 2px no-repeat,
    linear-gradient(currentColor, currentColor) 0 8px / 85% 2px no-repeat;
}

.align-ico.center {
  background:
    linear-gradient(currentColor, currentColor) center 0 / 100% 2px no-repeat,
    linear-gradient(currentColor, currentColor) center 4px / 70% 2px no-repeat,
    linear-gradient(currentColor, currentColor) center 8px / 85% 2px no-repeat;
}

.align-ico.right {
  background:
    linear-gradient(currentColor, currentColor) right 0 / 100% 2px no-repeat,
    linear-gradient(currentColor, currentColor) right 4px / 70% 2px no-repeat,
    linear-gradient(currentColor, currentColor) right 8px / 85% 2px no-repeat;
}

.icon.danger:hover {
  color: #f28b82;
}

.more-wrap {
  position: relative;
}

.menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 220px;
  max-height: 70vh;
  overflow: auto;
  padding: 6px;
  background: #2e3238;
  border: 1px solid var(--border-color, #474d54);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  z-index: 9001;
}

.menu button {
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

.menu button:hover {
  background: rgba(112, 113, 125, 0.35);
}

.menu button.danger {
  color: #f28b82;
}

.menu kbd {
  font-size: 11px;
  color: var(--control-text-color, #8b9198);
  font-family: inherit;
}

.sep {
  height: 1px;
  margin: 4px;
  background: var(--border-color, #474d54);
}
</style>
