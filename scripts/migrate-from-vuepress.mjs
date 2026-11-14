#!/usr/bin/env node
/**
 * 将 archive/vuepress 导出的 docs/ 迁移为 astro-koharu 内容。
 * 用法: node scripts/migrate-from-vuepress.mjs [docs导出目录]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { slugify } from 'transliteration';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_DOCS = path.resolve(process.argv[2] || '/tmp/code-guide-vuepress-docs');
const BLOG_DIR = path.join(ROOT, 'src/content/blog');
const PAGES_DIR = path.join(ROOT, 'src/pages');
const PUBLIC_IMG = path.join(ROOT, 'public/img');

const DROP_FM = new Set([
  'article',
  'index',
  'dir',
  'order',
  'home',
  'layout',
  'hero',
  'bgImage',
  'sidebar',
  'category',
  'tag',
  'star',
]);

/** 路径前缀 → 目标相对目录与默认分类 */
const ROUTE_MAP = [
  { prefix: 'posts/tools/', dest: 'tools/', categories: ['工具'] },
  { prefix: 'posts/ops/', dest: 'ops/', categories: ['运维'] },
  { prefix: 'posts/practice/', dest: 'practice/', categories: ['实践'] },
  { prefix: 'posts/embedded/', dest: 'embedded/', categories: ['嵌入式'] },
  { prefix: 'posts/leetcode/', dest: 'leetcode/', categories: ['LeetCode'] },
  { prefix: 'posts/', dest: 'posts/', categories: ['笔记'] },
  { prefix: 'projects/', dest: 'projects/', categories: ['项目'] },
  { prefix: 'source-reading/java/', dest: 'source-reading/java/', categories: [['源码阅读', 'Java']] },
  { prefix: 'source-reading/', dest: 'source-reading/', categories: ['源码阅读'] },
  { prefix: 'database/mysql/', dest: 'database/mysql/', categories: [['数据库', 'MySQL']] },
  { prefix: 'database/redis/', dest: 'database/redis/', categories: [['数据库', 'Redis']] },
  { prefix: 'database/', dest: 'database/', categories: ['数据库'] },
  {
    prefix: 'soft-exam/advanced-architect/',
    dest: 'soft-exam/advanced-architect/',
    categories: [['软考', '高级架构师']],
    math: true,
  },
  { prefix: 'soft-exam/', dest: 'soft-exam/', categories: ['软考'], math: true },
  { prefix: 'career/', dest: 'career/', categories: ['职场'] },
];

const usedLinks = new Set();
const stats = { posts: 0, skipped: 0, assets: 0, pages: 0 };

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function relFromDocs(abs) {
  return path.relative(SRC_DOCS, abs).split(path.sep).join('/');
}

function isIndexMd(rel) {
  const base = path.basename(rel);
  if (base === 'README.md' || base === 'index.md') return true;
  if (rel === 'index.md' || rel === 'site-timeline.md') return true;
  return false;
}

function dateFromFilename(name) {
  const m = name.match(/^(\d{4}-\d{2}-\d{2})-/);
  return m ? m[1] : null;
}

function makeLink(basename, title) {
  let raw = basename.replace(/\.md$/i, '');
  raw = raw.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  let link = slugify(raw || title || 'post', { lowercase: true, separator: '-' });
  link = link
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!link) link = 'post';
  let candidate = link;
  let i = 2;
  while (usedLinks.has(candidate)) {
    candidate = `${link}-${i++}`;
  }
  usedLinks.add(candidate);
  return candidate;
}

function matchRoute(rel) {
  for (const rule of ROUTE_MAP) {
    if (rel.startsWith(rule.prefix)) return rule;
  }
  return null;
}

function normalizeTags(tag) {
  if (!tag) return undefined;
  if (Array.isArray(tag)) return tag.map(String);
  return [String(tag)];
}

function normalizeCategories(data, route) {
  // 路径映射给出的嵌套分类优先（避免旧站扁平 category 冲掉系列层级）
  if (route?.categories) return route.categories;
  if (data.categories) return data.categories;
  if (data.category) {
    const c = data.category;
    if (Array.isArray(c)) return [c.map(String)];
    return [String(c)];
  }
  return undefined;
}

function convertCodeTabs(body) {
  // VuePress Hope: ::: code-tabs / @tab Title / ```...``` / :::
  return body.replace(/::: code-tabs\s*\n([\s\S]*?)\n:::/g, (_m, inner) => {
    const parts = inner.split(/^@tab\s+/m).filter((s) => s.trim());
    if (!parts.length) return inner;
    const group = 'code';
    return parts
      .map((part) => {
        const nl = part.indexOf('\n');
        const title = (nl === -1 ? part : part.slice(0, nl)).trim() || 'code';
        const content = (nl === -1 ? '' : part.slice(nl + 1)).trim();
        return `;;;${group} ${title}\n${content}\n;;;`;
      })
      .join('\n\n');
  });
}

function convertBody(body) {
  let text = body;
  // 交互组件首期改为说明文字
  text = text.replace(/<BinarySearchDemo\s*\/>/g, '> 交互演示已迁移静态站后暂未接入，请直接阅读下方代码实现。');
  text = text.replace(/<Bilibili\b[^>]*\/>/gi, '');
  text = text.replace(/<Bilibili\b[^>]*>[\s\S]*?<\/Bilibili>/gi, '');
  text = text.replace(/<SiteTimeline\s*\/>/g, '');
  text = convertCodeTabs(text);
  // 旧站 .html 内链粗略改成无后缀（不做完整映射）
  text = text.replace(/\((\/[^)\s]+)\.html(#[^)]*)?\)/g, '($1$2)');
  // 关于页路径
  text = text.replace(/\(\/about\/me(\.html)?\)/g, '(/about)');
  text = text.replace(/\(\/about\/site(\.html)?\)/g, '(/about)');
  return text;
}

function writePost(rel, abs) {
  const route = matchRoute(rel);
  if (!route) {
    stats.skipped++;
    console.warn(`skip (no route): ${rel}`);
    return;
  }

  const raw = fs.readFileSync(abs, 'utf8');
  const parsed = matter(raw);
  const data = { ...parsed.data };

  // 跳过明确非文章索引（已在外层过滤 README）；若 article:false 也跳过
  if (data.article === false) {
    stats.skipped++;
    return;
  }

  const basename = path.basename(rel);
  const date = data.date ? formatDate(data.date) : dateFromFilename(basename) || '2026-10-01';
  const title = data.title || basename.replace(/\.md$/, '');
  const link = makeLink(basename, title);
  const tags = normalizeTags(data.tag || data.tags);
  const categories = normalizeCategories(data, route);
  const sticky = data.star === true || data.sticky === true;

  const fm = {
    title: String(title),
    date,
    link,
  };
  if (data.description) fm.description = String(data.description);
  if (tags?.length) fm.tags = tags;
  if (categories) fm.categories = categories;
  if (sticky) fm.sticky = true;
  if (route.math || data.math === true || /\$\$/.test(parsed.content)) fm.math = true;

  for (const k of Object.keys(data)) {
    if (!DROP_FM.has(k) && !(k in fm) && k !== 'tags' && k !== 'categories' && k !== 'sticky') {
      // 不透传未知 Hope 字段
    }
  }

  const body = convertBody(parsed.content);
  // 保留前缀下的子目录，保证 ./assets 相对路径仍有效
  const under = rel.slice(route.prefix.length);
  const outRel = path.posix.join(route.dest, under);
  const outAbs = path.join(BLOG_DIR, outRel);
  ensureDir(path.dirname(outAbs));
  fs.writeFileSync(outAbs, matter.stringify(body.trimStart(), fm));
  stats.posts++;
  console.log(`post: ${rel} -> ${outRel} (${link})`);
}

function formatDate(d) {
  if (d instanceof Date && !Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const s = String(d);
  const m = s.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

function copyAssetsBesidePosts() {
  /** 递归收集名为 assets 的目录 */
  function findAssetDirs(dir) {
    const dirs = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (!ent.isDirectory()) continue;
      if (ent.name === 'assets') dirs.push(p);
      else dirs.push(...findAssetDirs(p));
    }
    return dirs;
  }

  for (const assetsDir of findAssetDirs(SRC_DOCS)) {
    const parentRel = relFromDocs(path.dirname(assetsDir)).replace(/\\/g, '/') + '/';
    if (parentRel.startsWith('bubble/')) continue;

    const matched = matchRoute(parentRel + 'dummy.md');
    if (!matched || !parentRel.startsWith(matched.prefix)) {
      console.warn(`skip assets: ${parentRel}`);
      continue;
    }
    const under = parentRel.slice(matched.prefix.length);
    const dest = path.join(BLOG_DIR, matched.dest, under, 'assets');
    ensureDir(dest);
    copyDir(assetsDir, dest);
    stats.assets++;
    console.log(`assets: ${relFromDocs(assetsDir)} -> ${path.relative(ROOT, dest)}`);
  }
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else {
      fs.copyFileSync(s, d);
    }
  }
}

function clearExampleBlog() {
  // 删除主题示例文，保留目录结构空着再写入
  for (const name of fs.readdirSync(BLOG_DIR)) {
    const p = path.join(BLOG_DIR, name);
    fs.rmSync(p, { recursive: true, force: true });
  }
  ensureDir(BLOG_DIR);
}

function writeAboutPage() {
  const mePath = path.join(SRC_DOCS, 'about/me.md');
  const sitePath = path.join(SRC_DOCS, 'about/site.md');
  const me = matter(fs.readFileSync(mePath, 'utf8'));
  const site = matter(fs.readFileSync(sitePath, 'utf8'));

  let siteBody = convertBody(site.content);
  // 更新技术选型段落为 koharu
  siteBody = siteBody.replace(
    /### 技术选型[\s\S]*?(?=### |$)/,
    `### 技术选型

- 静态站点：[Astro](https://astro.build/) + [astro-koharu](https://github.com/cosZone/astro-koharu)
- 内容：Markdown（GFM、数学公式、Mermaid 等）
- 检索：Pagefind
- 工程：\`pnpm\`；本地 \`pnpm dev\`，构建 \`pnpm build\`

`,
  );

  const content = `---
layout: ../layouts/PageLayout.astro
title: "关于"
coverTitle: "关于"
description: "关于 Charlie 与摸鱼猫泡泡"
comments: false
---

${me.content.trim()}

---

${siteBody.trim()}
`;

  fs.writeFileSync(path.join(PAGES_DIR, 'about.md'), content);
  stats.pages++;
  console.log('page: about.md');
}

function writeBubblePage() {
  const src = path.join(SRC_DOCS, 'bubble/README.md');
  const parsed = matter(fs.readFileSync(src, 'utf8'));
  let body = convertBody(parsed.content);
  // 资源改到 /img/bubble/
  body = body.replace(/\.\/assets\//g, '/img/bubble/');
  // 去掉 hope 定制 class 包装，保留图片
  body = body.replace(/<div class="jb-mascot">\s*/g, '').replace(/<\/div>\s*/g, '');

  const content = `---
layout: ../layouts/PageLayout.astro
title: "泡泡"
coverTitle: "泡泡"
description: "${String(parsed.data.description || '站点拟人形象泡泡').replace(/"/g, '\\"')}"
comments: false
---

${body.trim()}
`;
  fs.writeFileSync(path.join(PAGES_DIR, 'bubble.md'), content);

  const assetsSrc = path.join(SRC_DOCS, 'bubble/assets');
  if (fs.existsSync(assetsSrc)) {
    copyDir(assetsSrc, path.join(PUBLIC_IMG, 'bubble'));
  }
  stats.pages++;
  console.log('page: bubble.md');
}

function writeTimelinePage() {
  const eventsPath = path.join(
    ROOT,
    // 从 archive 取数据：已导出到临时目录外，直接内嵌已知数据；若有文件则读
  );
  void eventsPath;
  // 直接从 git archive 外的路径读 — 已在 /tmp 导出的 vuepress 不含 .vuepress
  // 用硬编码迁移（与 archive 一致）+ 追加 koharu 迁移事件
  const events = [
    {
      date: '2026-11-14',
      title: '迁移到 astro-koharu',
      description: '站点主题从 VuePress Theme Hope 迁移到 astro-koharu；旧站归档于 archive/vuepress 分支。',
    },
    {
      date: '2026-10-29',
      title: '泡泡人设上线',
      description: '新增泡泡栏目与三视图。',
    },
    {
      date: '2026-10-28',
      title: '文档骨架成型',
      description: '笔记系列、项目介绍、导航与检索等基础结构搭好。',
    },
    {
      date: '2026-10-28',
      title: '站点起步',
      description: '摸鱼猫泡泡仓库初始化：VuePress + Theme Hope，双许可落地。',
    },
  ];

  const lines = events.map((e) => `### ${e.date} · ${e.title}\n\n${e.description}\n`).join('\n');

  const content = `---
layout: ../layouts/PageLayout.astro
title: "站点时间线"
coverTitle: "站点时间线"
description: "摸鱼猫泡泡建站与栏目演进的时间线。"
comments: false
---

${lines}
`;
  fs.writeFileSync(path.join(PAGES_DIR, 'site-timeline.md'), content);
  stats.pages++;
  console.log('page: site-timeline.md');
}

function copySiteImages() {
  // 从 archive 检出的 public 图在 docs 外；尝试从 git show
  // 脚本运行前由 shell 导出到 /tmp/code-guide-vuepress-public
  const pub = '/tmp/code-guide-vuepress-public';
  if (!fs.existsSync(pub)) {
    console.warn('no public export at', pub);
    return;
  }
  ensureDir(PUBLIC_IMG);
  for (const name of ['logo.jpg', 'logo.png', 'beian.png', 'wechat-qr.jpg']) {
    const s = path.join(pub, 'img', name);
    if (fs.existsSync(s)) {
      const destName = name === 'logo.jpg' ? 'avatar.jpg' : name;
      // keep logo.jpg as well
      fs.copyFileSync(s, path.join(PUBLIC_IMG, name));
      if (name === 'logo.jpg') {
        fs.copyFileSync(s, path.join(PUBLIC_IMG, 'avatar.jpg'));
      }
      console.log(`img: ${name}`);
    }
  }
}

function main() {
  if (!fs.existsSync(SRC_DOCS)) {
    console.error('source docs not found:', SRC_DOCS);
    process.exit(1);
  }

  clearExampleBlog();
  copySiteImages();

  const mdFiles = walk(SRC_DOCS).filter((p) => p.endsWith('.md'));
  for (const abs of mdFiles) {
    const rel = relFromDocs(abs);
    if (rel.startsWith('.vuepress/')) continue;
    if (rel.startsWith('about/')) continue;
    if (rel.startsWith('bubble/')) continue;
    if (rel === 'site-timeline.md' || rel === 'index.md') continue;
    if (isIndexMd(rel)) {
      stats.skipped++;
      continue;
    }
    writePost(rel, abs);
  }

  copyAssetsBesidePosts();
  writeAboutPage();
  writeBubblePage();
  writeTimelinePage();

  console.log('\nDone:', stats);
}

main();
