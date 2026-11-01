<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { SHORTCUT_ROWS } from "@/lib/help/content";
import {
  APP_VERSION,
  MAIN_CREDITS,
  formatCreditsPlain,
} from "@/lib/help/credits";
import { SYNTAX_HELP_ROWS } from "@/lib/help/syntax";

type Panel = "about" | "shortcuts" | "syntax" | null;

const { t } = useI18n();
const panel = ref<Panel>(null);
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

const title = computed(() => {
  switch (panel.value) {
    case "about":
      return t("help.aboutTitle");
    case "shortcuts":
      return t("help.shortcutsTitle");
    case "syntax":
      return t("help.syntaxTitle");
    default:
      return "";
  }
});

const aboutBody = computed(() => t("help.aboutBody", { version: APP_VERSION }));

const copyText = computed(
  () =>
    [aboutBody.value, "", t("help.depsTitle"), formatCreditsPlain()].join(
      "\n",
    ),
);

function openAbout() {
  panel.value = "about";
  copied.value = false;
}
function openShortcuts() {
  panel.value = "shortcuts";
}
function openSyntax() {
  panel.value = "syntax";
}
function close() {
  panel.value = null;
  copied.value = false;
}

async function copyAbout() {
  try {
    await navigator.clipboard.writeText(copyText.value);
    copied.value = true;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    copied.value = false;
  }
}

function onHelp(e: Event) {
  const kind = (e as CustomEvent).detail;
  if (kind === "about") openAbout();
  else if (kind === "shortcuts") openShortcuts();
  else if (kind === "syntax") openSyntax();
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && panel.value) {
    e.stopPropagation();
    close();
  }
}

onMounted(() => {
  window.addEventListener("lunark:help", onHelp);
  window.addEventListener("keydown", onKey, true);
});
onUnmounted(() => {
  window.removeEventListener("lunark:help", onHelp);
  window.removeEventListener("keydown", onKey, true);
  if (copiedTimer) clearTimeout(copiedTimer);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="panel" class="help-backdrop" @click.self="close">
      <div
        class="help-panel"
        :class="{ wide: panel === 'about' || panel === 'syntax' }"
        role="dialog"
        :aria-label="title"
      >
        <header class="help-head">
          <h2>{{ title }}</h2>
          <button
            type="button"
            class="close"
            :title="t('help.close')"
            @click="close"
          >
            ×
          </button>
        </header>
        <div v-if="panel === 'about'" class="help-body about">
          <pre class="about-intro">{{ aboutBody }}</pre>
          <h3 class="deps-title">{{ t("help.depsTitle") }}</h3>
          <table class="deps-table">
            <thead>
              <tr>
                <th>{{ t("help.depName") }}</th>
                <th>{{ t("help.depVersion") }}</th>
                <th>{{ t("help.depLicense") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in MAIN_CREDITS" :key="row.name">
                <td>{{ row.name }}</td>
                <td class="mono">{{ row.version }}</td>
                <td class="mono">{{ row.license }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else-if="panel === 'syntax'" class="help-body syntax">
          <p class="tip">{{ t("help.syntaxIntro") }}</p>
          <section
            v-for="row in SYNTAX_HELP_ROWS"
            :key="row.id"
            class="sx-block"
          >
            <h3 class="sx-title">
              {{ t(row.titleKey) }}
              <span v-if="row.dialect" class="sx-badge">{{
                t("help.dialectBadge")
              }}</span>
            </h3>
            <p v-if="row.noteKey" class="sx-note">{{ t(row.noteKey) }}</p>
            <pre class="sx-sample"><code>{{ row.sample }}</code></pre>
          </section>
        </div>
        <div v-else class="help-body shortcuts">
          <table>
            <thead>
              <tr>
                <th>{{ t("help.keys") }}</th>
                <th>{{ t("help.action") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in SHORTCUT_ROWS" :key="row.keys">
                <td>
                  <kbd>{{ row.keys }}</kbd>
                </td>
                <td>{{ t(row.actionKey) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="tip">{{ t("help.tip") }}</p>
        </div>
        <footer v-if="panel === 'about'" class="help-foot">
          <button type="button" class="btn ghost" @click="copyAbout">
            {{ copied ? t("help.copied") : t("help.copy") }}
          </button>
          <button type="button" class="btn primary" @click="close">
            {{ t("help.ok") }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.help-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.help-panel {
  width: min(520px, 92vw);
  max-height: min(80vh, 640px);
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}

.help-panel.wide {
  width: min(560px, 94vw);
  max-height: min(86vh, 720px);
}

.sx-block {
  margin: 0 0 1.1rem;
}

.sx-title {
  margin: 0 0 0.35rem;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.sx-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  color: var(--primary-color);
  border: 1px solid var(--border-color);
  background: var(--item-hover-bg-color, transparent);
}

.sx-note {
  margin: 0 0 0.4rem;
  color: var(--control-text-color);
  font-size: 12px;
  line-height: 1.45;
}

.sx-sample {
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-radius: 6px;
  background: var(--code-bg, var(--rawblock-edit-panel-bd, #1a1d21));
  border: 1px solid var(--border-color);
  overflow: auto;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.sx-sample code {
  font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono",
    Menlo, monospace;
}

.help-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.help-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.close {
  border: 0;
  background: transparent;
  color: var(--control-text-color);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}

.close:hover {
  color: var(--text-color);
}

.help-body {
  padding: 14px 16px 18px;
  overflow: auto;
  font-size: 13px;
  flex: 1;
  min-height: 0;
}

.about-intro {
  margin: 0 0 14px;
  white-space: pre-wrap;
  font-family: inherit;
  line-height: 1.55;
}

.deps-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--control-text-color);
}

.deps-table {
  width: 100%;
  border-collapse: collapse;
}

.deps-table th,
.deps-table td {
  text-align: left;
  padding: 5px 8px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: top;
}

.deps-table th {
  color: var(--control-text-color);
  font-weight: 600;
  font-size: 12px;
}

.deps-table .mono {
  font-family: var(--font-mono, Consolas, "Cascadia Mono", monospace);
  font-size: 12px;
}

.shortcuts table {
  width: 100%;
  border-collapse: collapse;
}

.shortcuts th,
.shortcuts td {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: top;
}

.shortcuts th {
  color: var(--control-text-color);
  font-weight: 600;
  font-size: 12px;
}

.shortcuts kbd {
  font-family: var(--font-mono, Consolas, monospace);
  font-size: 12px;
  background: var(--side-bar-bg-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1px 6px;
}

.tip {
  margin: 12px 0 0;
  color: var(--control-text-color);
  font-size: 12px;
  line-height: 1.45;
}

.help-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px 12px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.btn {
  min-width: 72px;
  padding: 5px 14px;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: var(--side-bar-bg-color, transparent);
  color: var(--text-color);
}

.btn:hover {
  filter: brightness(1.06);
}

.btn.primary {
  background: var(--primary-color, #3b82f6);
  border-color: var(--primary-color, #3b82f6);
  color: #fff;
}

.btn.ghost {
  background: transparent;
}
</style>
