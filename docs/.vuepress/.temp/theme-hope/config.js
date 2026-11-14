import { Layout, NotFound, injectDarkMode, setupDarkMode, setupSidebarItems, scrollPromise } from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/vuepress-theme-hope@2.0.0-rc.110_gqlxhq3oy7pniwwtwe6e3hyati/node_modules/vuepress-theme-hope/dist/bundle/exports/base.js";

import { defineCatalogInfoGetter } from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-catalog@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5_@_3kxcfrh2k6uiy25iy7jobcvcta/node_modules/@vuepress/plugin-catalog/dist/client/index.js"
import { h } from "vue"
import { resolveComponent } from "vue"
import { Blog, BloggerInfo, SocialMedias, setupBlog } from "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/vuepress-theme-hope@2.0.0-rc.110_gqlxhq3oy7pniwwtwe6e3hyati/node_modules/vuepress-theme-hope/dist/bundle/exports/blog.js";
import "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/vuepress-theme-hope@2.0.0-rc.110_gqlxhq3oy7pniwwtwe6e3hyati/node_modules/vuepress-theme-hope/dist/client/styles/blog/layout.scss";

import "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+helper@2.0.0-rc.135_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5_@vue+comp_jot2u77rypcubiwufbhcc4lgj4/node_modules/@vuepress/helper/dist/client/styles/colors.css";
import "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+helper@2.0.0-rc.135_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5_@vue+comp_jot2u77rypcubiwufbhcc4lgj4/node_modules/@vuepress/helper/dist/client/styles/normalize.css";
import "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+helper@2.0.0-rc.135_@vuepress+bundler-vite@2.0.0-rc.31_@types+node@26.6.5_@vue+comp_jot2u77rypcubiwufbhcc4lgj4/node_modules/@vuepress/helper/dist/client/styles/sr-only.css";
import "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/vuepress-theme-hope@2.0.0-rc.110_gqlxhq3oy7pniwwtwe6e3hyati/node_modules/vuepress-theme-hope/dist/client/styles/index.scss";

defineCatalogInfoGetter((meta) => {
  const title = meta.title;
  const shouldIndex = meta.index ?? true;
  const icon = meta.icon;

  return shouldIndex ? {
    title,
    content: icon ? () =>[h(resolveComponent("VPIcon"), { icon, sizing: "both" }), title] : null,
    order: meta.order,
    index: meta.index,
  } : null;
});

export default {
  enhance: ({ app, router }) => {
    const { scrollBehavior } = router.options;

    router.options.scrollBehavior = async (...args) => {
      await scrollPromise.wait();

      return scrollBehavior(...args);
    };

    // inject global properties
    injectDarkMode(app);

    app.component("BloggerInfo", BloggerInfo);
    app.component("SocialMedias", SocialMedias);
  },
  setup: () => {
    setupDarkMode();
    setupSidebarItems();
    setupBlog();
  },
  layouts: {
    Layout,
    NotFound,
    Blog,
  }
};
