/**
 * 电子书拆分的集中配置：源文、输出路径、卷次分组、清洗规则。
 * 需要调整章节归属或分组时，只需改动本文件后重跑 `npm run gen`。
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = path.resolve(__dirname, '..')

/** 源文全文（仓库根目录，不移动、不修改） */
export const SOURCE = path.join(
  PROJECT_ROOT,
  '菩提道次第师承传-郭和卿译本(正文)-简体横排.md'
)

export const DOCS_ROOT = path.join(PROJECT_ROOT, 'docs')
export const CHAPTERS_ROOT = path.join(DOCS_ROOT, 'chapters')
export const DATA_FILE = path.join(DOCS_ROOT, '.vitepress', 'data', 'sidebar.mjs')
/** 已生成的页面清单，用于下一次生成时清理陈旧文件 */
export const MANIFEST_FILE = path.join(
  DOCS_ROOT,
  '.vitepress',
  'data',
  'generated-files.json'
)

/** 主传章节篇数（84 篇），用于生成后的自检断言 */
export const EXPECTED_MAIN_COUNT = 84

/**
 * 卷次分组：按传承脉络把 84 篇主传归入若干可读的分组。
 * range 为闭区间 [起, 止]，对应「一、」到「八十四、」的篇序号。
 */
export const GROUPS = [
  {
    id: 'guangxing',
    text: '广行派师承',
    note: '自释迦牟尼佛传至尊弥勒、无著、世亲诸师，乃至金洲大师',
    range: [1, 13]
  },
  {
    id: 'shenguan',
    text: '深观派师承',
    note: '自至尊文殊传圣龙树菩萨及其弟子，乃至阿阇黎勇金刚',
    range: [14, 21]
  },
  {
    id: 'gadang',
    text: '阿底峡尊者与噶当派',
    note: '三派法流汇于阿底峡尊者，下传种敦巴与噶当诸善知识',
    range: [22, 45]
  },
  {
    id: 'zongkaba',
    text: '宗喀巴大师及其法脉',
    note: '至尊三界法王宗喀巴大师、其首要弟子，直至绛伯嘉措',
    range: [46, 58]
  },
  {
    id: 'houqi',
    text: '后期传承师资',
    note: '班禅、达赖诸世系与甘丹法脉师资，迄于编著者时代',
    range: [59, 84]
  }
]

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
