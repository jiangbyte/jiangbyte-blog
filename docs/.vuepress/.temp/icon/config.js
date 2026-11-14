import { hasGlobalComponent } from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+helper@2.0.0-rc.135_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5_@vue+comp_jot2u77rypcubiwufbhcc4lgj4/node_modules/@vuepress/helper/dist/client/index.js";
import { setupIconify } from "@temp/icon/iconify.js";
import { h } from "vue";
import { VPIcon } from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-icon@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5_@vue_ejo6undg2qe4lxqzwk7grssnra/node_modules/@vuepress/plugin-icon/dist/client/index.js"

export default {
  enhance: ({ app }) => {
    setupIconify();
    if(!hasGlobalComponent("VPIcon")) {
      app.component(
        "VPIcon",
        (props) =>
          h(VPIcon, {
            type: "iconify",
            prefix: "mdi:",
            ...props,
          })
      )
    }
  },
  setup: () => {

  },
}
