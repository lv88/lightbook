/**
 * 电子书拆分的集中配置：路径常量、默认切分规则、书籍扫描。
 *
 * 一本书 = sources/ 下的一个 md 源文 + books/<slug>/book.mjs 一份配置。
 * 新增一本书：把 md 放进 sources/，再建 books/<slug>/book.mjs 指向它，重跑 `npm run gen` 即可。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = path.resolve(__dirname, '..')

/** 源文目录：各书 md 平铺于此，只读、不改动 */
export const SOURCES_ROOT = path.join(PROJECT_ROOT, 'sources')

/** 书籍配置目录：books/<slug>/book.mjs，脚本自动扫描 */
export const BOOKS_ROOT = path.join(PROJECT_ROOT, 'books')

export const DOCS_ROOT = path.join(PROJECT_ROOT, 'docs')

/** 生成页面的站点前缀：/book/<slug>/… */
export const BOOKS_URL_PREFIX = '/book'

/** 某本书的页面输出根目录 */
export const bookDocsRoot = (slug) => path.join(DOCS_ROOT, 'book', slug)

/** 某本书的链接前缀 */
export const bookUrlPrefix = (slug) => `${BOOKS_URL_PREFIX}/${slug}`

export const DATA_FILE = path.join(DOCS_ROOT, '.vitepress', 'data', 'books.mjs')

/** 已生成的页面清单，用于下一次生成时清理陈旧文件 */
export const MANIFEST_FILE = path.join(
  DOCS_ROOT,
  '.vitepress',
  'data',
  'generated-files.json'
)

/**
 * 正文行首的 Markdown 敏感写法：这些字符出现在行首会被 markdown-it
 * 解析为引用、标题、列表或表格。清洗时插入反斜杠转义，确保「原文照录」。
 */
export const ESCAPE_RULES = [
  { name: 'blockquote', re: /^(\s*)(>)/, rep: '$1\\$2' },
  { name: 'heading', re: /^(\s*)(#{1,6})(\s+)/, rep: '$1\\$2$3' },
  { name: 'bullet', re: /^(\s*)([-*+])(\s+)/, rep: '$1\\$2$3' },
  { name: 'ordered', re: /^(\s*)(\d{1,3}\.)(\s+)/, rep: '$1\\$2$3' },
  { name: 'table', re: /^(\s*)(\|)/, rep: '$1\\$2' }
]

/**
 * 默认切分规则。各书可在 book.mjs 中逐项覆盖。
 * 默认值与《菩提道次第师师相承传》的历史行为完全一致，保证既有书目零漂移。
 */
export const DEFAULT_RULES = {
  /** 主传判定：二级标题形如「一、…」，且序号须连续（见 requireSequential） */
  mainTitleRe: /^([一二三四五六七八九十百]+)、(.+)$/,
  /** 卷前（如「缘起」「前言」）：编号篇之前的前置篇，默认无 */
  frontTitleRe: null,
  /** 卷末（如「回向偈」）：全文末尾的独立短篇，默认无 */
  tailTitleRe: null,
  /** 附录部判定：形如「附录、…」的标题及其下级，默认启用 */
  appendixTitleRe: /^附录[、，,:：]?\s*(.+)$/,
  /** 主传序号是否必须连续递增 */
  requireSequential: true,
  /** 生成后断言主传篇数，null 表示不断言 */
  expectedMainCount: null,
  /** 卷次分组；空数组表示不分组、篇目平铺 */
  groups: [],
  /** 行首转义规则 */
  escapeRules: ESCAPE_RULES,
  /**
   * 译者附录声明。设置后该书的附录视为「译者自撰」：
   * 单独成翻页序列、页首标注撰者、不计入主传书目。
   */
  translator: null,
  /** 封面页正文（Markdown） */
  intro: '',
  /** 封面页来源／体例说明 */
  notice: '',
  /** 书架排序权重，升序；缺省按 slug 字母序 */
  order: 0
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

/**
 * 扫描 books/<slug>/book.mjs，与 DEFAULT_RULES 合并后返回书籍配置数组。
 * 任一本配置缺字段、slug 重复或源文缺失，均直接抛错终止，避免生成出坏站。
 */
export async function loadBooks() {
  if (!fs.existsSync(BOOKS_ROOT)) {
    throw new Error(`书籍配置目录不存在：${path.relative(PROJECT_ROOT, BOOKS_ROOT)}`)
  }
  if (!fs.existsSync(SOURCES_ROOT)) {
    throw new Error(`源文目录不存在：${path.relative(PROJECT_ROOT, SOURCES_ROOT)}`)
  }

  const dirs = fs
    .readdirSync(BOOKS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  const books = []
  const seenSlugs = new Set()

  for (const dir of dirs) {
    const configFile = path.join(BOOKS_ROOT, dir, 'book.mjs')
    if (!fs.existsSync(configFile)) {
      console.warn(`[gen] 跳过 ${dir}/：缺少 book.mjs`)
      continue
    }

    const mod = await import(pathToFileURL(configFile).href)
    const raw = mod.default
    if (!raw || typeof raw !== 'object') {
      throw new Error(`${dir}/book.mjs 必须 export default 一个配置对象`)
    }

    const cfg = { ...DEFAULT_RULES, ...raw }

    if (!cfg.slug || typeof cfg.slug !== 'string') {
      throw new Error(`${dir}/book.mjs 缺少 slug 字段`)
    }
    if (!SLUG_RE.test(cfg.slug)) {
      throw new Error(`${dir}/book.mjs 的 slug「${cfg.slug}」不合法，仅允许小写字母、数字与连字符`)
    }
    if (seenSlugs.has(cfg.slug)) {
      throw new Error(`slug 重复：${cfg.slug}（${dir}/book.mjs）`)
    }
    seenSlugs.add(cfg.slug)

    if (!cfg.source || typeof cfg.source !== 'string') {
      throw new Error(`${dir}/book.mjs 缺少 source 字段（sources/ 下的 md 文件名）`)
    }
    const sourcePath = path.join(SOURCES_ROOT, cfg.source)
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`${dir}/book.mjs 的 source 不存在：sources/${cfg.source}`)
    }
    cfg.sourcePath = sourcePath

    if (!Array.isArray(cfg.groups)) {
      throw new Error(`${dir}/book.mjs 的 groups 必须是数组（不分组时写 []）`)
    }
    if (cfg.frontTitleRe && !(cfg.frontTitleRe instanceof RegExp)) {
      throw new Error(`${dir}/book.mjs 的 frontTitleRe 必须是 RegExp 或 null`)
    }
    if (cfg.tailTitleRe && !(cfg.tailTitleRe instanceof RegExp)) {
      throw new Error(`${dir}/book.mjs 的 tailTitleRe 必须是 RegExp 或 null`)
    }
    if (cfg.appendixTitleRe && !(cfg.appendixTitleRe instanceof RegExp)) {
      throw new Error(`${dir}/book.mjs 的 appendixTitleRe 必须是 RegExp 或 null`)
    }

    books.push(cfg)
  }

  if (!books.length) {
    throw new Error(`未在 ${path.relative(PROJECT_ROOT, BOOKS_ROOT)} 下发现任何书籍配置`)
  }

  books.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.slug.localeCompare(b.slug))
  return books
}
