<div align="center">

# jiangbyte-blog

**摸鱼猫泡泡**

Astro + [astro-koharu](https://github.com/cosZone/astro-koharu) fork · 记录工具与工程实践

[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build/)
[![Site](https://img.shields.io/badge/Site-jiangbyte.cn-0A66C2)](https://jiangbyte.cn)
[![License: AGPL-3.0](https://img.shields.io/badge/Code-AGPL--3.0-blue.svg)](./LICENSE)

</div>

个人站点源码，在线阅读：[jiangbyte.cn](https://jiangbyte.cn)

本仓基于 astro-koharu 定制。

---

## 分支

| 分支 | 说明 |
|------|------|
| `main` | 当前站点（astro-koharu 定制） |
| `vuepress2` | 旧 VuePress + Theme Hope 站归档 |

## 环境

- Node.js ≥ 22.20
- pnpm 10.28.2（`packageManager` 字段，可用 corepack）

## 快速开始

```bash
pnpm install
pnpm dev           # http://localhost:4321
pnpm build         # 产出 dist/
pnpm preview
pnpm run deploy    # 构建并 rsync 到 VPS（→ /opt/nginx-gateway/sites/blog；勿用 pnpm deploy）
```

- 站点：https://jiangbyte.cn
- 站点配置：[`config/site.yaml`](./config/site.yaml)
- 文章目录：`src/content/blog/`
- 写作室：`/editor`（需 `editor.enabled: true`）

## 许可证

双许可：

- **文档内容**（`src/content/` 下 Markdown 与配图等）— 可引用、可改编，须署名并附来源，禁止商用  
  [![CC BY-NC 4.0](https://licensebuttons.net/l/by-nc/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc/4.0/)
  · [全文](./LICENSE-CC-BY-NC-4.0)
- **站点源码**（基于 astro-koharu 的主题与工程文件）— [AGPL-3.0](./LICENSE)
