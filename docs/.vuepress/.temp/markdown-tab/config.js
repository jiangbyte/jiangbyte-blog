import { VPCodeTabs } from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-markdown-tab@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26._fhyk43kgiz2hudywnnxd24by5a/node_modules/@vuepress/plugin-markdown-tab/dist/client/components/VPCodeTabs.js";
import { VPTabs } from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-markdown-tab@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26._fhyk43kgiz2hudywnnxd24by5a/node_modules/@vuepress/plugin-markdown-tab/dist/client/components/VPTabs.js";

export default {
  enhance: ({ app }) => {
    app.component("VPCodeTabs", VPCodeTabs);
    app.component("VPTabs", VPTabs);
  },
};
