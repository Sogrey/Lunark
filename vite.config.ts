/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
  clearScreen: false,
  optimizeDeps: {
    include: ["html-to-image"],
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    // 桌面端单包体积偏大（Mermaid/Shiki/Crepe）属预期；500kB 告警噪声可忽略
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          // 已去掉聚合包 `codemirror`，只拆实际依赖的 @codemirror/*
          codemirror: [
            "@codemirror/lang-markdown",
            "@codemirror/language",
            "@codemirror/language-data",
            "@codemirror/state",
            "@codemirror/view",
            "@codemirror/commands",
            "@codemirror/search",
            "@codemirror/autocomplete",
            "@codemirror/theme-one-dark",
          ],
          mermaid: ["mermaid"],
          shiki: ["shiki"],
          katex: ["katex", "@mdit/plugin-katex"],
        },
      },
    },
  },
}));
