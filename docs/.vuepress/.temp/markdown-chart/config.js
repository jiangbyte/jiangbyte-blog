import { defineClientConfig } from "vuepress/client";
import Mermaid from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-markdown-chart@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@2_lrlr6vmyou62ti56ht77xa7x7q/node_modules/@vuepress/plugin-markdown-chart/dist/client/components/Mermaid.js";

export default defineClientConfig({
  enhance: ({ app }) => {
    app.component("Mermaid", Mermaid);
  },
});
