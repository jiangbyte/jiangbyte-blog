import { defineClientConfig } from 'vuepress/client'
import { VPFileTreeNode } from '/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-markdown-file-tree@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+no_irm44xbyhtcyrjoicr6utwba7e/node_modules/@vuepress/plugin-markdown-file-tree/dist/client/components/VPFileTreeNode.js'
import { VPFileTree } from '/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-markdown-file-tree@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+no_irm44xbyhtcyrjoicr6utwba7e/node_modules/@vuepress/plugin-markdown-file-tree/dist/client/components/VPFileTree.js'
import { VPCodeTree } from '/home/jiang/workspace/projects/mine/code-guide/node_modules/.pnpm/@vuepress+plugin-markdown-file-tree@2.0.0-rc.137_@vuepress+bundler-vite@2.0.0-rc.31_@types+no_irm44xbyhtcyrjoicr6utwba7e/node_modules/@vuepress/plugin-markdown-file-tree/dist/client/components/VPCodeTree.js'

export default defineClientConfig({
  enhance({ app }) {
    app.component('VPFileTreeNode', VPFileTreeNode)
    app.component('VPFileTree', VPFileTree)
    app.component('VPCodeTree', VPCodeTree)
  },
})
