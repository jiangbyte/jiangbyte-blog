import { RevealJs, injectRevealJsConfig } from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-revealjs@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5__uofab3rmx54ija6avikkbtrrye/node_modules/@vuepress/plugin-revealjs/dist/client/index.js";
import { SlidePage } from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-revealjs@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5__uofab3rmx54ija6avikkbtrrye/node_modules/@vuepress/plugin-revealjs/dist/client/layouts/index.js";

import "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/reveal.js@6.0.2/node_modules/reveal.js/dist/reveal.css";
import "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-revealjs@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5__uofab3rmx54ija6avikkbtrrye/node_modules/@vuepress/plugin-revealjs/dist/client/styles/vars.css";
import "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-revealjs@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5__uofab3rmx54ija6avikkbtrrye/node_modules/@vuepress/plugin-revealjs/dist/client/styles/themes/base.css";
import "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-revealjs@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5__uofab3rmx54ija6avikkbtrrye/node_modules/@vuepress/plugin-revealjs/dist/client/styles/fonts/league-gothic.css";
import "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-revealjs@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5__uofab3rmx54ija6avikkbtrrye/node_modules/@vuepress/plugin-revealjs/dist/client/styles/fonts/source-sans-pro.css";
import "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-revealjs@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5__uofab3rmx54ija6avikkbtrrye/node_modules/@vuepress/plugin-revealjs/dist/client/styles/themes/auto.css";

export default {
  enhance: ({ app }) => {
    injectRevealJsConfig(app)
    app.component("RevealJs", RevealJs)
  },
  layouts: { "Slides": SlidePage },
};
