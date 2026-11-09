import type { Page, Plugin } from 'vuepress/core'

/** 文件名开头的日期：2026-11-05-标题.md */
const FILENAME_DATE_RE = /^(\d{4}-\d{2}-\d{2})-/u

/**
 * 从相对路径解析文章日期；README / 无日期前缀返回 null。
 */
export function dateFromFilename(
  filePathRelative: string | null | undefined,
): string | null {
  if (!filePathRelative) return null
  const base = filePathRelative.split('/').pop() || ''
  if (/^readme\.md$/iu.test(base)) return null
  const m = FILENAME_DATE_RE.exec(base)
  return m?.[1] ?? null
}

/**
 * 将 frontmatter.date 解析为毫秒时间戳（与主题 getDate 一致）。
 */
function dateToTime(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const t = Date.parse(String(value))
  return Number.isNaN(t) ? null : t
}

/**
 * 补全页面元信息（用户插件在主题 blog 之后执行，故需回写 routeMeta）：
 * - 无 date → 用文件名 YYYY-MM-DD-（README 跳过）
 * - 有 description 无 excerpt → 写入 excerpt，避免自动摘要盖掉 YAML 描述
 */
export function filenameMetaPlugin(): Plugin {
  return {
    name: 'jb-filename-meta',
    extendsPage(page: Page) {
      // 1. 日期：文件名优先补全 frontmatter
      if (!page.frontmatter.date) {
        const date = dateFromFilename(page.filePathRelative)
        if (date) page.frontmatter.date = date
      }

      // 2. 描述：有 YAML description 时当作卡片摘要
      const desc = page.frontmatter.description
      if (
        !page.frontmatter.excerpt &&
        typeof desc === 'string' &&
        desc.trim().length > 0
      ) {
        page.frontmatter.excerpt = desc
      }

      // 3. 回写 routeMeta：覆盖 blog 先写入的 git 时间 / 正文截取摘要
      const dateMs = dateToTime(page.frontmatter.date)
      if (dateMs != null) page.routeMeta.date = dateMs

      const excerpt = page.frontmatter.excerpt
      if (typeof excerpt === 'string' && excerpt.trim().length > 0) {
        page.routeMeta.excerpt = excerpt
        // 与卡片一致，避免页面 data.excerpt 仍是自动截取
        page.data.excerpt = excerpt
      }
    },
  }
}
