/**
 * 把 sources/ 下的多份 Markdown 源文，按 books/<slug>/book.mjs 的规则
 * 各自切分为一本 VitePress 电子书，输出到 docs/book/<slug>/，
 * 并汇总生成 .vitepress/data/books.mjs 供 config.mts 与主题组件导入。
 *
 * 用法：npm run gen
 *
 * 每本书的切分判定（顺序固定，命中即止）：
 *  - tailTitleRe    且二级标题 → 卷末（如「回向偈」）
 *  - frontTitleRe   且二级标题且尚未出现主传 → 卷前（如「缘起」「前言」）
 *  - appendixTitleRe 且二级标题 → 进入附录部（其后同级标题仍属附录）
 *  - mainTitleRe    且二级标题且序号连续 → 新主传（目录下 index.md）
 *  - 其余标题 → 归属当前篇的子页（NN.md）
 *  - 正文为空的子章节仅记录告警，不生成页面
 */
import fs from 'node:fs'
import path from 'node:path'
import {
  DATA_FILE,
  DOCS_ROOT,
  MANIFEST_FILE,
  bookDocsRoot,
  bookUrlPrefix,
  loadBooks
} from './book-config.mjs'

const CN_DIGITS = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
const CN_UNITS = { 十: 10, 百: 100, 千: 1000 }
const HEADING_RE = /^(#{1,6})\s+(.*)$/

const warnings = []
const escapeStats = new Map()

/** 中文数字 → 阿拉伯数字（支持到千位） */
function cn2num(input) {
  let total = 0
  let carry = 0
  for (const ch of input) {
    const unit = CN_UNITS[ch]
    if (unit) {
      carry = (carry || 1) * unit
      total += carry
      carry = 0
    } else {
      carry = CN_DIGITS[ch] ?? 0
    }
  }
  return total + carry
}

const pad = (n) => String(n).padStart(2, '0')

/**
 * 上一次生成的文件清单（相对 docs 的路径）。
 * 用它按需清理陈旧文件，避免整目录删除导致大批量删除失败。
 */
function readManifest() {
  if (!fs.existsSync(MANIFEST_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'))
  } catch (error) {
    console.error('[gen] 读取生成清单失败，已按空清单处理', error)
    return []
  }
}

function pruneStaleTargets(written) {
  const stale = readManifest().filter((target) => !written.includes(target))
  for (const target of stale) {
    const full = path.join(DOCS_ROOT, target)
    if (!fs.existsSync(full)) continue
    try {
      fs.rmSync(full, { force: true })
    } catch (error) {
      console.error(`[gen] 清理陈旧页面失败（可忽略）：${target}`, error)
    }
  }
  return stale
}

function readSourceLines(sourcePath) {
  const raw = fs.readFileSync(sourcePath, 'utf8')
  const text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  return text.split('\n')
}

/**
 * 按标题把全文切成扁平的节点列表。
 * 首个标题之前的内容留作 preamble（多为著者署名），HTML 注释不计入。
 */
function parseNodes(lines) {
  const nodes = []
  let bookTitle = ''
  const preamble = []
  for (const line of lines) {
    const matched = HEADING_RE.exec(line)
    if (matched) {
      const level = matched[1].length
      const title = matched[2].trim().replace(/[：:\s]+$/u, '')
      if (level === 1 && !bookTitle) {
        bookTitle = title
        continue
      }
      nodes.push({ level, title, body: [] })
      continue
    }
    if (nodes.length) nodes[nodes.length - 1].body.push(line)
    else if (line.trim() && !line.trim().startsWith('<!--')) preamble.push(line.trim())
  }
  return { bookTitle, nodes, preamble: preamble.join('\n') }
}

/**
 * 把扁平节点组织成 卷前 / 主传（含子页）/ 卷末 / 附录 四部分。
 * 各判定正则均来自该书配置，未配置的能力自动关闭。
 */
function buildTree(nodes, cfg) {
  const tree = []
  const front = []
  const tail = []
  const appendix = { title: '', body: [], children: [] }
  let inAppendix = false
  let current = null

  const asChild = (node) => ({ level: node.level, title: node.title, body: node.body })

  for (const node of nodes) {
    // 卷末：即便出现在附录之后也认，故先于附录判定
    if (cfg.tailTitleRe && node.level <= 2 && cfg.tailTitleRe.test(node.title)) {
      inAppendix = false
      const item = { title: node.title, body: node.body, children: [] }
      tail.push(item)
      current = { kind: 'tail', item }
      continue
    }

    // 卷前：只在主传开始前判定
    if (
      cfg.frontTitleRe &&
      node.level <= 2 &&
      !tree.length &&
      !inAppendix &&
      cfg.frontTitleRe.test(node.title)
    ) {
      const item = { title: node.title, body: node.body, children: [] }
      front.push(item)
      current = { kind: 'front', item }
      continue
    }

    // 附录部：第一个匹配的二级标题为附录首页，其后同级标题仍属附录
    if (cfg.appendixTitleRe && node.level <= 2 && cfg.appendixTitleRe.test(node.title)) {
      if (!appendix.title) {
        appendix.title = node.title
        appendix.body = node.body
        inAppendix = true
        current = { kind: 'appendix', item: appendix }
        continue
      }
      if (inAppendix) {
        appendix.children.push(asChild(node))
        continue
      }
    }

    if (inAppendix) {
      if (node.level <= 2) {
        warnings.push(`[${cfg.slug}] 附录之后出现同级标题「${node.title}」，已忽略`)
        continue
      }
      appendix.children.push(asChild(node))
      continue
    }

    // 主传：二级标题 + 序号连续（可关闭连续性要求）
    const matched = cfg.mainTitleRe.exec(node.title)
    const ordinal = matched ? cn2num(matched[1]) : 0
    const prev = tree[tree.length - 1]
    const isMain =
      node.level === 2 &&
      matched !== null &&
      (!cfg.requireSequential || ordinal === (prev ? prev.ordinal + 1 : 1))

    if (isMain) {
      const item = { ordinal, title: node.title, body: node.body, children: [] }
      tree.push(item)
      current = { kind: 'main', item }
      continue
    }

    if (!current) {
      warnings.push(`[${cfg.slug}] 首个篇目之前出现标题「${node.title}」，已忽略`)
      continue
    }
    current.item.children.push(asChild(node))
  }

  return { tree, front, tail, appendix: appendix.title ? appendix : null }
}

/** 清洗正文：行尾空白、多余空行、行首 Markdown 敏感字符转义 */
function cleanBody(bodyLines, escapeRules) {
  const lines = bodyLines.map((line) => {
    let text = line.replace(/[ \t]+$/u, '')
    for (const rule of escapeRules) {
      if (rule.re.test(text)) {
        text = text.replace(rule.re, rule.rep)
        escapeStats.set(rule.name, (escapeStats.get(rule.name) ?? 0) + 1)
      }
    }
    return text
  })

  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()

  const result = []
  for (const line of lines) {
    const blank = !line.trim()
    if (blank && result.length && !result[result.length - 1].trim()) continue
    result.push(line)
  }
  return result.join('\n').trimEnd()
}

function frontmatter(data) {
  const lines = ['---']
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue
    lines.push(typeof value === 'number' ? `${key}: ${value}` : `${key}: ${JSON.stringify(value)}`)
  }
  lines.push('---', '')
  return lines.join('\n')
}

/** 内容未变则不写，避免大批量文件无谓改动时间戳 */
function writeIfChanged(file, content, writtenTargets, relTarget) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) {
    writtenTargets.push(relTarget)
    return false
  }
  fs.writeFileSync(file, content, 'utf8')
  writtenTargets.push(relTarget)
  return true
}

function groupOf(ordinal, cfg) {
  if (!cfg.groups.length) return null
  const found = cfg.groups.find((g) => ordinal >= g.range[0] && ordinal <= g.range[1])
  if (!found) {
    throw new Error(
      `[${cfg.slug}] 第 ${ordinal} 篇未落入任何分组，请检查 books/${cfg.slug}/book.mjs 的 groups`
    )
  }
  return found
}

/**
 * 生成一本书：写页面、构建侧边栏与翻页序列，返回汇总数据。
 */
function buildBook(cfg) {
  const base = bookUrlPrefix(cfg.slug)
  const root = bookDocsRoot(cfg.slug)
  const writtenTargets = []

  const lines = readSourceLines(cfg.sourcePath)
  const { bookTitle, nodes, preamble } = parseNodes(lines)
  const { tree, front, tail, appendix } = buildTree(nodes, cfg)

  const title = cfg.title || bookTitle
  const byline = cfg.byline || preamble

  if (cfg.expectedMainCount !== null && tree.length !== cfg.expectedMainCount) {
    throw new Error(
      `[${cfg.slug}] 主传章节数应为 ${cfg.expectedMainCount} 篇，实际解析出 ${tree.length} 篇`
    )
  }

  const seenLinks = new Set()
  const assertLink = (link) => {
    if (seenLinks.has(link)) throw new Error(`[${cfg.slug}] 链接重复：${link}`)
    seenLinks.add(link)
    return link
  }
  /** 写入页面并记录相对 docs 的路径 */
  const emit = (relFile, content) => {
    const file = path.join(root, relFile)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    writeIfChanged(file, content, writtenTargets, path.posix.join('book', cfg.slug, relFile))
  }

  let pageCount = 0
  let skippedEmpty = 0
  const commonFront = { book: cfg.slug, bookTitle: title, byline }

  // ── 卷前（缘起、前言…）
  const frontEntries = []
  front.forEach((item, index) => {
    const slug = pad(index + 1)
    const link = assertLink(`${base}/front/${slug}`)
    const body = cleanBody(item.body, cfg.escapeRules)
    if (!body) {
      skippedEmpty += 1
      warnings.push(`[${cfg.slug}] 卷前篇正文为空（未生成页面）：${item.title}`)
      return
    }
    emit(
      `front/${slug}.md`,
      [
        frontmatter({ ...commonFront, title: item.title, kind: 'front' }),
        `# ${item.title}`,
        '',
        body,
        ''
      ].join('\n')
    )
    pageCount += 1
    frontEntries.push({ title: item.title, link, kind: 'front' })
  })

  // ── 主传与子页
  // 未配置 groups 时全书归入一个「篇目」组，篇目平铺
  const groups = cfg.groups.length
    ? cfg.groups.map((g) => ({ ...g, chapters: [] }))
    : [{ id: 'all', text: '篇目', chapters: [] }]
  const flat = []
  for (const chapter of tree) {
    const group = groupOf(chapter.ordinal, cfg)
    const bucket = group ? groups.find((g) => g.id === group.id) : groups[0]
    const dir = pad(chapter.ordinal)
    const mainLink = assertLink(`${base}/chapters/${dir}/`)
    const mainBody = cleanBody(chapter.body, cfg.escapeRules)
    if (!mainBody) warnings.push(`[${cfg.slug}] 第 ${chapter.ordinal} 篇正文为空：${chapter.title}`)

    emit(
      `chapters/${dir}/index.md`,
      [
        frontmatter({
          ...commonFront,
          title: chapter.title,
          kind: 'chapter',
          ordinal: chapter.ordinal,
          group: group ? group.text : null
        }),
        `# ${chapter.title}`,
        '',
        mainBody,
        ''
      ].join('\n')
    )
    pageCount += 1

    const children = []
    for (const child of chapter.children) {
      const body = cleanBody(child.body, cfg.escapeRules)
      if (!body) {
        skippedEmpty += 1
        warnings.push(`[${cfg.slug}] 空子章节（未生成页面）：${chapter.title} → ${child.title}`)
        continue
      }
      // 文件名与链接必须同步补零：文件是 01.md，链接就必须是 /01，
      // 否则带上 cleanUrls 后子页会出现 404。
      const slug = pad(children.length + 1)
      const link = assertLink(`${base}/chapters/${dir}/${slug}`)
      emit(
        `chapters/${dir}/${slug}.md`,
        [
          frontmatter({
            ...commonFront,
            title: child.title,
            kind: 'sub',
            ordinal: chapter.ordinal,
            group: group ? group.text : null,
            parent: chapter.title,
            parentLink: mainLink
          }),
          `# ${child.title}`,
          '',
          `> 本篇为 [${chapter.title}](${mainLink}) 之附传。`,
          '',
          body,
          ''
        ].join('\n')
      )
      pageCount += 1
      children.push({ title: child.title, link, parent: chapter.title })
    }

    const record = {
      title: chapter.title,
      link: mainLink,
      kind: 'chapter',
      ordinal: chapter.ordinal,
      group: group ? group.text : ''
    }
    flat.push(record)
    if (children.length) {
      // 子页紧随其主传之后进入翻页序列
      flat.push(
        ...children.map((child) => ({
          title: child.title,
          link: child.link,
          kind: 'sub',
          ordinal: chapter.ordinal,
          group: group ? group.text : '',
          parent: child.parent
        }))
      )
    }
    bucket.chapters.push({ ...record, children })
  }

  // ── 卷末（回向偈…）
  const tailEntries = []
  tail.forEach((item, index) => {
    const slug = pad(index + 1)
    const link = assertLink(`${base}/tail/${slug}`)
    const body = cleanBody(item.body, cfg.escapeRules)
    if (!body) {
      skippedEmpty += 1
      warnings.push(`[${cfg.slug}] 卷末篇正文为空（未生成页面）：${item.title}`)
      return
    }
    emit(
      `tail/${slug}.md`,
      [
        frontmatter({ ...commonFront, title: item.title, kind: 'tail' }),
        `# ${item.title}`,
        '',
        body,
        ''
      ].join('\n')
    )
    pageCount += 1
    tailEntries.push({ title: item.title, link, kind: 'tail' })
  })

  // ── 附录：单独成序列，不并入主传书目
  const appendixFlat = []
  let appendixCount = 0
  if (appendix) {
    const indexLink = assertLink(`${base}/appendix/`)
    const indexBody = cleanBody(appendix.body, cfg.escapeRules)
    const isTranslator = Boolean(cfg.translator)
    const author = isTranslator ? cfg.translator.author : null

    const head = [
      frontmatter({
        ...commonFront,
        title: appendix.title,
        kind: isTranslator ? 'translator-appendix' : 'appendix',
        author
      }),
      `# ${appendix.title}`,
      ''
    ]
    if (isTranslator) {
      head.push(`*${author} 撰*`, '', '::: tip 关于本篇', cfg.translator.notice, ':::', '')
    }
    head.push(indexBody, '')

    emit(`appendix/index.md`, head.filter((x) => x !== null).join('\n'))
    appendixCount += 1

    appendixFlat.push({ title: appendix.title, link: indexLink, kind: 'appendix', author })

    let appendixChildCount = 0
    for (const child of appendix.children) {
      const body = cleanBody(child.body, cfg.escapeRules)
      if (!body) {
        skippedEmpty += 1
        warnings.push(`[${cfg.slug}] 空附录小节（未生成页面）：${child.title}`)
        continue
      }
      const slug = pad(appendixChildCount + 1)
      const link = assertLink(`${base}/appendix/${slug}`)
      const head2 = [
        frontmatter({
          ...commonFront,
          title: child.title,
          kind: isTranslator ? 'translator-appendix' : 'appendix',
          author,
          parent: appendix.title,
          parentLink: indexLink
        }),
        `# ${child.title}`,
        '',
        isTranslator
          ? `> 本篇为 ${author} 所撰《学习六部》总叙之一段，非原著正文，详见[附录总叙](${indexLink})。`
          : `> 本篇为 [${appendix.title}](${indexLink}) 之一节。`,
        '',
        body,
        ''
      ]
      emit(`appendix/${slug}.md`, head2.join('\n'))
      appendixChildCount += 1
      appendixCount += 1
      appendixFlat.push({
        title: child.title,
        link,
        kind: 'appendix',
        author,
        parent: appendix.title
      })
    }
    pageCount += appendixCount
  }

  // ── 封面页
  const chapterLink = flat.length ? flat[0].link : base
  const stats = {
    mainCount: tree.length,
    subCount: flat.filter((item) => item.kind === 'sub').length,
    frontCount: frontEntries.length,
    tailCount: tailEntries.length,
    appendixCount,
    pageCount,
    skippedEmpty
  }
  const coverParts = [
    frontmatter({
      title,
      book: cfg.slug,
      bookTitle: title,
      byline,
      kind: 'cover',
      sidebar: false,
      outline: false,
      description: cfg.description
    }),
    `# ${title}`,
    ''
  ]
  if (cfg.subtitle) coverParts.push(`### ${cfg.subtitle}`, '')
  if (byline) coverParts.push(`*${byline}*`, '')
  if (cfg.notice) coverParts.push('::: tip 关于本书', cfg.notice, ':::', '')
  if (cfg.intro) coverParts.push(cfg.intro, '')
  coverParts.push(
    '---',
    '',
    `**开始阅读** ⟶ [${flat.length ? flat[0].title : '全书目录'}](${chapterLink})　·　[全书目录](${base}/contents)　·　[返回书架](/)`,
    '',
    `> 全书 ${stats.mainCount} 篇${stats.subCount ? ` · 附篇 ${stats.subCount} 篇` : ''}${stats.appendixCount ? ` · 附录 ${stats.appendixCount} 页` : ''} · 合计 ${stats.pageCount} 页`,
    ''
  )
  emit('index.md', coverParts.join('\n'))

  // ── 目录页
  emit(
    'contents.md',
    [
      frontmatter({
        title: `${title} · 全书目录`,
        book: cfg.slug,
        bookTitle: title,
        kind: 'contents',
        sidebar: false,
        outline: false
      }),
      '<script setup>',
      "import BookContents from '../../.vitepress/theme/BookContents.vue'",
      '</script>',
      '',
      '# 全书目录',
      '',
      `<BookContents slug="${cfg.slug}" />`,
      ''
    ].join('\n')
  )

  // ── 侧边栏（整书一份）
  const sidebar = []
  if (frontEntries.length) {
    sidebar.push({
      text: '卷前',
      collapsed: false,
      items: frontEntries.map((item) => ({ text: item.title, link: item.link }))
    })
  }
  for (const g of groups) {
    sidebar.push({
      text: g.text,
      collapsed: false,
      items: g.chapters.map((c) => {
        const item = { text: c.title, link: c.link }
        if (c.children.length) {
          item.collapsed = true
          item.items = c.children.map((child) => ({ text: child.title, link: child.link }))
        }
        return item
      })
    })
  }
  if (tailEntries.length) {
    sidebar.push({
      text: '卷末',
      collapsed: false,
      items: tailEntries.map((item) => ({ text: item.title, link: item.link }))
    })
  }
  if (appendixFlat.length) {
    sidebar.push({
      text: cfg.translator ? cfg.translator.text : '附录',
      collapsed: false,
      items: appendixFlat.map((item) => ({ text: item.title, link: item.link }))
    })
  }

  return {
    card: {
      slug: cfg.slug,
      title,
      subtitle: cfg.subtitle || '',
      byline,
      description: cfg.description || '',
      link: `${base}/`,
      contentsLink: `${base}/contents`,
      firstLink: chapterLink,
      stats,
      translator: cfg.translator
        ? { author: cfg.translator.author, text: cfg.translator.text, notice: cfg.translator.notice }
        : null
    },
    sidebarKey: `${base}/`,
    sidebar,
    chapters: [...frontEntries.map((i) => ({ ...i, group: '卷前' })), ...flat, ...tailEntries.map((i) => ({ ...i, group: '卷末' }))],
    appendixChapters: appendixFlat,
    writtenTargets,
    stats
  }
}

/**
 * 自检：每条 link 都必须落到真实存在的 md 文件上。
 * VitePress 开启 cleanUrls 后不做回退重试，链接写错（如补零不一致）会直接 404，
 * 因此在生成阶段就校验，避免坏链接流入站点。
 */
function resolveLinkFile(link) {
  const rel = link.replace(/^\//, '').replace(/\/$/, '')
  const asDir = path.join(DOCS_ROOT, rel, 'index.md')
  const asFile = path.join(DOCS_ROOT, `${rel}.md`)
  if (fs.existsSync(asDir)) return asDir
  if (fs.existsSync(asFile)) return asFile
  return null
}

async function main() {
  const configs = await loadBooks()

  const allTargets = []
  const cards = []
  const sidebarByPath = {}
  const chaptersByBook = {}
  const appendixChaptersByBook = {}

  for (const cfg of configs) {
    const result = buildBook(cfg)
    allTargets.push(...result.writtenTargets)
    cards.push(result.card)
    sidebarByPath[result.sidebarKey] = result.sidebar
    chaptersByBook[cfg.slug] = result.chapters
    appendixChaptersByBook[cfg.slug] = result.appendixChapters

    console.log(
      `[gen] 《${result.card.title}》主传 ${result.stats.mainCount} 篇，页面 ${result.stats.pageCount} 个` +
        (result.stats.appendixCount ? `（附录 ${result.stats.appendixCount} 页）` : '') +
        (result.stats.skippedEmpty ? `，跳过空篇 ${result.stats.skippedEmpty} 个` : '') +
        ` → docs/book/${cfg.slug}/`
    )
  }

  const broken = [...Object.values(chaptersByBook), ...Object.values(appendixChaptersByBook)]
    .flat()
    .filter((item) => !resolveLinkFile(item.link))
  if (broken.length) {
    throw new Error(
      `以下 ${broken.length} 条链接没有对应页面文件（cleanUrls 下会 404）：\n` +
        broken.map((item) => `       - ${item.title} → ${item.link}`).join('\n')
    )
  }

  const dataFileContent = [
    '// 本文件由 scripts/split.mjs 自动生成，请勿手工修改；改动源文或书籍配置后重跑 `npm run gen`。',
    `export const books = ${JSON.stringify(cards, null, 2)}`,
    `export const sidebarByPath = ${JSON.stringify(sidebarByPath, null, 2)}`,
    `export const chaptersByBook = ${JSON.stringify(chaptersByBook, null, 2)}`,
    `export const appendixChaptersByBook = ${JSON.stringify(appendixChaptersByBook, null, 2)}`,
    `/** 按页面路径定位所属书；传入的 path 需已去掉 base */`,
    'export function bookByPath(path) {',
    '  return books.find((book) => path.startsWith(book.link)) || null',
    '}',
    ''
  ].join('\n\n')

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.writeFileSync(DATA_FILE, dataFileContent, 'utf8')

  const stale = pruneStaleTargets(allTargets)
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(allTargets, null, 2)}\n`, 'utf8')

  const escaped = [...escapeStats.entries()].map(([k, v]) => `${k}×${v}`).join('，') || '无'
  console.log(`[gen] 共 ${cards.length} 本书，生成页面 ${allTargets.length} 个，清理陈旧文件 ${stale.length} 个`)
  console.log(`[gen] 行首转义：${escaped}`)
  if (warnings.length) {
    console.log(`[gen] 告警 ${warnings.length} 条：`)
    for (const w of warnings) console.log(`       - ${w}`)
  } else {
    console.log('[gen] 无告警')
  }
  console.log(`[gen] 站点数据：${path.relative(process.cwd(), DATA_FILE)}`)
}

main().catch((error) => {
  console.error('[gen] 生成失败：', error instanceof Error ? error.message : error)
  process.exit(1)
})
