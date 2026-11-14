<div align="center">

# code-guide

**摸鱼猫泡泡**

Astro + [astro-koharu](https://github.com/cosZone/astro-koharu) · 记录 Java、工具与工程实践

[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build/)
[![Theme](https://img.shields.io/badge/Theme-astro--koharu-ed788b)](https://github.com/cosZone/astro-koharu)
[![Site](https://img.shields.io/badge/Site-jiangbyte.cn-0A66C2)](https://jiangbyte.cn)
[![License: AGPL-3.0](https://img.shields.io/badge/Code-AGPL--3.0-blue.svg)](./LICENSE)

</div>

摸鱼猫泡泡源码，在线阅读：[jiangbyte.cn](https://jiangbyte.cn)

---

## 分支

| 分支 | 说明 |
|------|------|
| `koharu` / `main` | 当前站点（astro-koharu） |
| `archive/vuepress` | 旧 VuePress + Theme Hope 站归档，只读 |

主题上游：`upstream` → `git@github.com:cosZone/astro-koharu.git`  
更新主题：`pnpm koharu update`（详见上游 GETTING-STARTED）

## 环境

- Node.js ≥ 22.20
- pnpm 10.28.2（`packageManager` 字段，可用 corepack）

## 快速开始

```bash
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # 产出 dist/
pnpm preview
pnpm deploy    # 构建并 rsync 到 nginx（需本机 SSH Host）
```

站点配置：[`config/site.yaml`](./config/site.yaml)  
文章目录：`src/content/blog/`  
从旧站再导入：`node scripts/migrate-from-vuepress.mjs <docs导出目录>`

## 许可证

双许可：

- **文档内容**（`src/content/` 下 Markdown 与配图等）— 可引用、可改编，须署名并附来源，禁止商用  
  [![CC BY-NC 4.0](https://licensebuttons.net/l/by-nc/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc/4.0/)
  · [全文](./LICENSE-CC-BY-NC-4.0)
- **站点源码**（基于 astro-koharu 的主题与工程文件）— [AGPL-3.0](./LICENSE)
