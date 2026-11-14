import CodeDemo from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/vuepress-plugin-md-enhance@2.0.0-rc.110_@vue+repl@4.7.2_@vuepress+bundler-vite@2.0.0-rc.31_@t_wedxzb3d2zqawr2e4vkdglouji/node_modules/vuepress-plugin-md-enhance/dist/client/components/CodeDemo.js";
import MdDemo from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/vuepress-plugin-md-enhance@2.0.0-rc.110_@vue+repl@4.7.2_@vuepress+bundler-vite@2.0.0-rc.31_@t_wedxzb3d2zqawr2e4vkdglouji/node_modules/vuepress-plugin-md-enhance/dist/client/components/MdDemo.js";
import Playground from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/vuepress-plugin-md-enhance@2.0.0-rc.110_@vue+repl@4.7.2_@vuepress+bundler-vite@2.0.0-rc.31_@t_wedxzb3d2zqawr2e4vkdglouji/node_modules/vuepress-plugin-md-enhance/dist/client/components/Playground.js";

export default {
  enhance: ({ app }) => {
    app.component("CodeDemo", CodeDemo);
    app.component("MdDemo", MdDemo);
    app.component("Playground", Playground);
  },
};
