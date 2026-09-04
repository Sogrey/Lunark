import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { i18n } from "@/lib/i18n";
import { bootstrapWindowGeometry } from "@/lib/window/bootstrapGeometry";

import "@/styles/themes/night.css";
import "@/styles/themes/github.css";
import "@/styles/themes/newsprint.css";
import "@/styles/themes/pixyll.css";
import "@/styles/themes/whitey.css";
import "@/styles/themes/night-preview.css";
import "@/styles/themes/hybrid-crepe.css";
import "@/styles/base.css";
import "katex/dist/katex.min.css";
import "element-plus/es/components/message/style/css";

async function main() {
  await bootstrapWindowGeometry();

  const app = createApp(App);
  app.use(createPinia());
  app.use(i18n);
  app.mount("#app");
}

void main();
