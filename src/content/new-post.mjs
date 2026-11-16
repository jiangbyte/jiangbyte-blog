#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { stdin, stdout } from 'node:process';
import { emitKeypressEvents } from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { slugify } from 'transliteration';
import YAML from 'yaml';

const PROJECT_ROOT = path.resolve(process.argv[2] || path.resolve(import.meta.dirname, '../..'));
const BLOG_ROOT = path.join(PROJECT_ROOT, 'src/content/blog');
const SITE_CONFIG_PATH = path.join(PROJECT_ROOT, 'config/site.yaml');

const rl = createInterface({ input: stdin, output: stdout });

try {
  const siteConfigSource = await fs.readFile(SITE_CONFIG_PATH, 'utf8');
  const siteConfig = YAML.parse(siteConfigSource) ?? {};
  const categoryNames = Object.keys(siteConfig.categoryMap ?? {});
  if (categoryNames.length === 0) {
    throw new Error('config/site.yaml 中没有可用的 categoryMap 分类。');
  }

  const title = await askRequired('标题');
  const { name: category, isNew: isNewCategory } = await askCategory(categoryNames);
  const tags = parseTags(await rl.question('标签（逗号分隔，可留空）: '));
  const directories = await listBlogDirectories(BLOG_ROOT);
  const { directory: destination, isNew: isNewDirectory } = await askDirectory(directories);
  const timestamp = formatSiteDateTime(new Date(), siteConfig.site?.timezone || 'Asia/Shanghai');
  const date = timestamp.slice(0, 10);
  const filename = `${date}-${createFilenameTitle(title)}.md`;
  const targetPath = path.join(BLOG_ROOT, destination.relativePath, filename);
  const frontmatter = YAML.stringify({
    title,
    date: timestamp,
    ...(tags.length > 0 ? { tags } : {}),
    categories: [category],
  }).trimEnd();

  const categorySlug = isNewCategory
    ? createUniqueSlug(category, Object.values(siteConfig.categoryMap ?? {}))
    : siteConfig.categoryMap[category];
  let categoryMapUpdated = false;

  if (isNewDirectory) {
    await fs.mkdir(path.join(BLOG_ROOT, destination.relativePath), { recursive: true });
  }

  if (isNewCategory) {
    await fs.writeFile(SITE_CONFIG_PATH, appendCategoryMapping(siteConfigSource, category, categorySlug), 'utf8');
    categoryMapUpdated = true;
  }

  try {
    await fs.writeFile(targetPath, `---\n${frontmatter}\n---\n\n`, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (categoryMapUpdated) {
      await fs.writeFile(SITE_CONFIG_PATH, siteConfigSource, 'utf8');
    }
    throw error;
  }

  console.log(`\n已创建: ${toPosix(path.relative(PROJECT_ROOT, targetPath))}`);
  console.log(`分类: ${category}`);
  if (isNewCategory) {
    console.log(`新增分类映射: ${category} -> ${categorySlug}`);
    console.log('config/site.yaml 已更新；如果开发服务器正在运行，请重启后查看新分类页。');
  }
  if (isNewDirectory) {
    console.log(`新增文章目录: blog/${toPosix(destination.relativePath)}`);
  }
} catch (error) {
  if (error?.code === 'EEXIST') {
    console.error('\n创建失败：同名文章已经存在。');
  } else if (error?.name === 'AbortError') {
    console.error('\n已取消。');
  } else {
    console.error(`\n创建失败：${error instanceof Error ? error.message : String(error)}`);
  }
  process.exitCode = 1;
} finally {
  rl.close();
}

async function askRequired(label) {
  while (true) {
    const value = (await rl.question(`${label}: `)).trim();
    if (value) return value;
    console.log(`${label}不能为空。`);
  }
}

async function askCategory(choices) {
  const options = [...choices.map((name) => ({ label: name, isNew: false })), { label: '＋ 新建分类', isNew: true }];
  const selected = await selectOption('分类', options);
  if (!selected.isNew) {
    return { name: selected.label, isNew: false };
  }

  while (true) {
    const answer = await askRequired('新分类名');
    const existing = choices.find((choice) => choice.localeCompare(answer, undefined, { sensitivity: 'base' }) === 0);
    if (existing) {
      console.log(`分类“${existing}”已经存在，将使用现有分类。`);
      return { name: existing, isNew: false };
    }
    return { name: answer, isNew: true };
  }
}

async function listBlogDirectories(root) {
  const directories = [{ relativePath: '', depth: 0 }];

  async function visit(relativePath) {
    const absolutePath = path.join(root, relativePath);
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    const childDirectories = entries
      .filter(
        (entry) => entry.isDirectory() && entry.name !== 'assets' && !entry.name.startsWith('.') && !entry.name.startsWith('_'),
      )
      .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));

    for (const entry of childDirectories) {
      const childRelativePath = path.join(relativePath, entry.name);
      directories.push({ relativePath: childRelativePath, depth: childRelativePath.split(path.sep).length });
      await visit(childRelativePath);
    }
  }

  await visit('');
  return directories;
}

async function askDirectory(directories) {
  const options = directories.map((directory) => {
    const displayPath = directory.relativePath ? `blog/${toPosix(directory.relativePath)}` : 'blog';
    return {
      label: `${'  '.repeat(directory.depth)}${displayPath}`,
      value: directory,
      isNew: false,
    };
  });
  options.push({ label: '＋ 新建目录', value: null, isNew: true, accent: true });

  const selected = await selectOption('放置目录（必须选择）', options);
  if (!selected.isNew) {
    return { directory: selected.value, isNew: false };
  }

  while (true) {
    const answer = (await rl.question('新目录（相对 blog，例如 sss 或 aaa/ass）: ')).trim();
    try {
      const directory = parseNewBlogDirectory(answer);
      return { directory, isNew: true };
    } catch (error) {
      console.log(error instanceof Error ? error.message : String(error));
    }
  }
}

async function selectOption(title, options) {
  if (!stdin.isTTY || !stdout.isTTY) {
    return selectByNumber(title, options);
  }

  let selectedIndex = 0;
  let renderedLines = 0;
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  stdout.write('\x1b[?25l');

  return new Promise((resolve, reject) => {
    const color = (text, code) => (process.env.NO_COLOR ? text : `\x1b[${code}m${text}\x1b[0m`);

    const render = () => {
      if (renderedLines > 0) {
        stdout.write(`\x1b[${renderedLines}A\x1b[0J`);
      }

      const lines = [
        color(title, '1;36'),
        ...options.map((option, index) => {
          if (index === selectedIndex) {
            return color(`> ${option.label}`, '1;30;46');
          }
          return option.accent ? color(`  ${option.label}`, '1;32') : `  ${option.label}`;
        }),
        color('↑/↓ 或 j/k 选择 · Enter 确认', '2'),
      ];
      stdout.write(`${lines.join('\n')}\n`);
      renderedLines = lines.length;
    };

    const cleanup = () => {
      stdin.off('keypress', onKeypress);
      if (stdin.isTTY && stdin.isRaw) {
        stdin.setRawMode(false);
      }
      if (renderedLines > 0) {
        stdout.write(`\x1b[${renderedLines}A\x1b[0J`);
      }
      stdout.write('\x1b[?25h');
    };

    const onKeypress = (_input, key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        const error = new Error('Cancelled');
        error.name = 'AbortError';
        reject(error);
        return;
      }

      if (key.name === 'up' || key.name === 'k') {
        selectedIndex = (selectedIndex - 1 + options.length) % options.length;
        render();
        return;
      }

      if (key.name === 'down' || key.name === 'j') {
        selectedIndex = (selectedIndex + 1) % options.length;
        render();
        return;
      }

      if (key.name === 'return') {
        const selected = options[selectedIndex];
        cleanup();
        console.log(`${title}: ${selected.label.trim()}`);
        resolve(selected);
      }
    };

    stdin.on('keypress', onKeypress);
    render();
  });
}

function parseNewBlogDirectory(value) {
  const normalizedInput = value.trim().replaceAll('\\', '/');
  if (!normalizedInput) {
    throw new Error('目录不能为空。');
  }
  if (normalizedInput.startsWith('/') || /^[A-Za-z]:\//.test(normalizedInput)) {
    throw new Error('请输入相对 src/content/blog 的目录路径。');
  }

  const normalizedPath = path.posix.normalize(normalizedInput).replace(/\/+$/, '');
  if (normalizedPath === '.' || normalizedPath.startsWith('../') || normalizedPath === '..') {
    throw new Error('目录不能跳出 src/content/blog。');
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  if (segments.some((segment) => segment === 'assets' || segment.startsWith('.') || segment.startsWith('_'))) {
    throw new Error('目录名不能是 assets，也不能以 . 或 _ 开头。');
  }

  return {
    relativePath: segments.join(path.sep),
    depth: segments.length,
  };
}

async function selectByNumber(title, options) {
  console.log(`\n${title}:`);
  for (const [index, option] of options.entries()) {
    console.log(`  ${String(index + 1).padStart(2)}. ${option.label}`);
  }

  while (true) {
    const answer = (await rl.question('输入编号: ')).trim();
    const index = Number(answer) - 1;
    if (Number.isInteger(index) && index >= 0 && index < options.length) {
      return options[index];
    }
    console.log(`请输入 1-${options.length} 之间的编号。`);
  }
}

function parseTags(value) {
  return [
    ...new Set(
      value
        .split(/[\s,，]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

function createFilenameTitle(title) {
  return (
    title
      .normalize('NFC')
      .replace(/[\\/:*?"<>|\p{Cc}]/gu, '-')
      .replace(/\s+/g, ' ')
      .trim() || '未命名文章'
  );
}

function createCategorySlug(title) {
  return slugify(title, { separator: '-' }).replace(/-+/g, '-').replace(/^-|-$/g, '') || 'category';
}

function createUniqueSlug(value, existingSlugs) {
  const base = createCategorySlug(value);
  let candidate = base;
  let suffix = 2;
  const usedSlugs = new Set(existingSlugs);

  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function appendCategoryMapping(source, name, slug) {
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^categoryMap:\s*(?:#.*)?$/.test(line));
  if (headerIndex === -1) {
    throw new Error('config/site.yaml 中未找到 categoryMap。');
  }

  let insertionIndex = headerIndex;
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\S/.test(line)) break;
    if (/^\s{2}[^\s#].*$/.test(line)) {
      insertionIndex = index;
    }
  }

  const mapping = YAML.stringify({ [name]: slug }, { lineWidth: 0 })
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => `  ${line}`)
    .join(newline);
  lines.splice(insertionIndex + 1, 0, mapping);
  return lines.join(newline);
}

function formatSiteDateTime(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}
