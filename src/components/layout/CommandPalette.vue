<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { fuzzyFilter } from "@/lib/commands/fuzzy";
import {
  buildCommands,
  categoryLabel,
  type CommandItem,
} from "@/lib/commands/registry";

const { t } = useI18n();
const open = ref(false);
const query = ref("");
const active = ref(0);
const inputEl = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
const commands = ref<CommandItem[]>([]);

const filtered = computed(() =>
  fuzzyFilter(
    commands.value,
    query.value,
    (c) => `${c.label} ${c.keywords} ${c.id}`,
  ),
);

watch(filtered, () => {
  active.value = 0;
});

watch(open, async (v) => {
  if (!v) return;
  commands.value = buildCommands();
  query.value = "";
  active.value = 0;
  await nextTick();
  inputEl.value?.focus();
  inputEl.value?.select();
});

function openPalette() {
  open.value = true;
}

function closePalette() {
  open.value = false;
  query.value = "";
}

function runActive() {
  const item = filtered.value[active.value];
  if (!item) return;
  closePalette();
  // 下一帧再执行，避免焦点仍在面板上
  requestAnimationFrame(() => item.run());
}

function move(delta: number) {
  const n = filtered.value.length;
  if (n === 0) return;
  active.value = (active.value + delta + n) % n;
  void nextTick(() => {
    const el = listEl.value?.querySelector(
      `[data-cmd-index="${active.value}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  });
}

function onInputKey(e: KeyboardEvent) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    move(1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    move(-1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    runActive();
  } else if (e.key === "Escape") {
    e.preventDefault();
    closePalette();
  }
}

function onGlobalKey(e: KeyboardEvent) {
  if (e.key === "Escape" && open.value) {
    e.preventDefault();
    e.stopPropagation();
    closePalette();
    return;
  }
}

function onOpenEvent() {
  openPalette();
}

onMounted(() => {
  window.addEventListener("lunark:command-palette", onOpenEvent);
  window.addEventListener("keydown", onGlobalKey, true);
});

onUnmounted(() => {
  window.removeEventListener("lunark:command-palette", onOpenEvent);
  window.removeEventListener("keydown", onGlobalKey, true);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="cmd-backdrop"
      role="presentation"
      @click.self="closePalette"
    >
      <div
        class="cmd-panel"
        role="dialog"
        :aria-label="t('cmd.title')"
        @keydown="onInputKey"
      >
        <input
          ref="inputEl"
          v-model="query"
          class="cmd-input"
          type="search"
          autocomplete="off"
          spellcheck="false"
          :placeholder="t('cmd.placeholder')"
          :aria-label="t('cmd.placeholder')"
        />
        <div ref="listEl" class="cmd-list" role="listbox">
          <button
            v-for="(item, i) in filtered"
            :key="item.id"
            type="button"
            class="cmd-row"
            :class="{ active: i === active }"
            role="option"
            :aria-selected="i === active"
            :data-cmd-index="i"
            @mouseenter="active = i"
            @click="
              active = i;
              runActive();
            "
          >
            <span class="cmd-label">{{ item.label }}</span>
            <span class="cmd-cat">{{ categoryLabel(item.category) }}</span>
          </button>
          <div v-if="filtered.length === 0" class="cmd-empty">
            {{ t("cmd.empty") }}
          </div>
        </div>
        <footer class="cmd-foot">
          <span>{{ t("cmd.hint") }}</span>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cmd-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10060;
  display: flex;
  justify-content: center;
  padding-top: min(18vh, 140px);
  background: rgba(0, 0, 0, 0.4);
}

.cmd-panel {
  width: min(560px, 92vw);
  max-height: min(70vh, 480px);
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.cmd-input {
  width: 100%;
  box-sizing: border-box;
  border: 0;
  border-bottom: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-color);
  padding: 14px 16px;
  font-size: 15px;
  outline: none;
}

.cmd-list {
  flex: 1;
  min-height: 120px;
  overflow: auto;
  padding: 6px;
}

.cmd-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--text-color);
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.cmd-row:hover,
.cmd-row.active {
  background: color-mix(
    in srgb,
    var(--primary-color, #6dc1e7) 18%,
    transparent
  );
}

.cmd-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cmd-cat {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--focus-dim-color, #888);
}

.cmd-empty {
  padding: 24px 12px;
  text-align: center;
  font-size: 13px;
  color: var(--focus-dim-color, #888);
}

.cmd-foot {
  border-top: 1px solid var(--border-color);
  padding: 6px 12px;
  font-size: 11px;
  color: var(--focus-dim-color, #888);
}
</style>
