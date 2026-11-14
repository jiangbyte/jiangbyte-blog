import { hasGlobalComponent } from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+helper@2.0.0-rc.135_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5_@vue+comp_jot2u77rypcubiwufbhcc4lgj4/node_modules/@vuepress/helper/dist/client/index.js";
import Badge from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/vuepress-plugin-components@2.0.0-rc.110_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5_ptmke3qeqdntz4rhyf3zdkroze/node_modules/vuepress-plugin-components/dist/client/components/Badge.js";
import VPCard from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/vuepress-plugin-components@2.0.0-rc.110_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5_ptmke3qeqdntz4rhyf3zdkroze/node_modules/vuepress-plugin-components/dist/client/components/VPCard.js";

import "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+helper@2.0.0-rc.135_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5_@vue+comp_jot2u77rypcubiwufbhcc4lgj4/node_modules/@vuepress/helper/dist/client/styles/sr-only.css";

export default {
  enhance: ({ app }) => {
    if(!hasGlobalComponent("Badge")) app.component("Badge", Badge);
    if(!hasGlobalComponent("VPCard")) app.component("VPCard", VPCard);
    
  },
  setup: () => {

  },
  rootComponents: [

  ],
};
