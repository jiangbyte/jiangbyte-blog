export const useRevealJs = () => Promise.all(
  __VUEPRESS_SSR__
    ? []
    : [
        import(/* webpackChunkName: "reveal" */ "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/reveal.js@6.0.2/node_modules/reveal.js/dist/reveal.mjs").then(({ default: RevealJs }) => RevealJs),
        import(/* webpackChunkName: "reveal" */ "/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/reveal.js@6.0.2/node_modules/reveal.js/dist/plugin/markdown.mjs").then(({ default: plugin }) => plugin),
      
      ]
  );
