/**
 * 将单文件 Markdown《菩提道次第师师相承传》切分为 VitePress 页面树，
 * 并生成 .vitepress/data/sidebar.mjs 供 config.mts 导入。
 *
 * 用法：npm run gen
 *
 * 切分规则：
 *  - 二级标题且形如「一、…」且序号连续 → 新主传章节（目录下 index.md）
 *  - 其余二级标题（附一、琐记、年表…）与所有三级标题 → 归属当前主传的子页（NN.md）
 *  - 正文为空的子章节仅记录告警，不生成页面
 */
import fs from 'node:fs'
import path from 'node:path'
import {
  APPENDIX_ROOT,
  APPENDIX_TITLE_RE,
  CHAPTERS_ROOT,
  DATA_FILE,
  DOCS_ROOT,
  ESCAPE_RULES,
  EXPECTED_MAIN_COUNT,
  GROUPS,
  MANIFEST_FILE,
  SOURCE,
  TRANSLATOR_APPENDIX
} from './book-config.mjs'

const CN_DIGITS = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
const CN_UNITS = { 十: 10, 百: 100, 千: 1000 }
const MAIN_TITLE_RE = /^([一二三四五六七八九十百]+)、(.+)$/
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

function readSourceLines() {
  const raw = fs.readFileSync(SOURCE, 'utf8')
  const text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  return text.split('\n')
}

/** 按标题把全文切成扁平的节点列表 */
function parseNodes(lines) {
  const nodes = []
  let bookTitle = ''
  const front = []
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
    else if (line.trim()) front.push(line)
  }
  if (front.length) {
    warnings.push(`发现 ${front.length} 行位于首个标题之前，已忽略`)
  }
  return { bookTitle, nodes }
}

/**
 * 把扁平节点组织成「主传 → 子章节」两级树；
 * 末尾的译者附录单独抽出（译者自撰，非原著正文），不与章节树混编。
 */
function buildTree(nodes) {
  const tree = []
  const appendix = { title: '', body: [], children: [] }
  let inAppendix = false

  for (const node of nodes) {
    if (!inAppendix && node.level <= 2 && APPENDIX_TITLE_RE.test(node.title)) {
      inAppendix = true
      appendix.title = node.title
      appendix.body = node.body
      continue
    }
    if (inAppendix) {
      if (node.level <= 2) {
        warnings.push(`译者附录之后出现同级标题「${node.title}」，已忽略`)
        continue
      }
      appendix.children.push({ level: node.level, title: node.title, body: node.body })
      continue
    }

    const matched = MAIN_TITLE_RE.exec(node.title)
    const ordinal = matched ? cn2num(matched[1]) : 0
    const prev = tree[tree.length - 1]
    const isMain =
      node.level === 2 &&
      matched !== null &&
      ordinal === (prev ? prev.ordinal + 1 : 1)

    if (isMain) {
      tree.push({ ordinal, title: node.title, body: node.body, children: [] })
      continue
    }
    if (!prev) {
      warnings.push(`首个主传标题之前出现标题「${node.title}」，已忽略`)
      continue
    }
    prev.children.push({ level: node.level, title: node.title, body: node.body })
  }

  return { tree, appendix: appendix.title ? appendix : null }
}

/** 清洗正文：行尾空白、多余空行、行首 Markdown 敏感字符转义 */
function cleanBody(bodyLines) {
  const lines = bodyLines.map((line) => {
    let text = line.replace(/[ \t]+$/u, '')
    for (const rule of ESCAPE_RULES) {
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
    lines.push(typeof value === 'number' ? `${key}: ${value}` : `${key}: ${JSON.stringify(value)}`)
  }
  lines.push('---', '')
  return lines.join('\n')
}

function groupOf(ordinal) {
  const found = GROUPS.find((g) => ordinal >= g.range[0] && ordinal <= g.range[1])
  if (!found) throw new Error(`第 ${ordinal} 篇未落入任何分组，请检查 scripts/book-config.mjs 的 GROUPS`)
  return found
}

function main() {
  const lines = readSourceLines()
  const { bookTitle, nodes } = parseNodes(lines)
  const { tree, appendix } = buildTree(nodes)

  if (tree.length !== EXPECTED_MAIN_COUNT) {
    throw new Error(`主传章节数应为 ${EXPECTED_MAIN_COUNT} 篇，实际解析出 ${tree.length} 篇`)
  }

  const writtenTargets = []
  fs.mkdirSync(CHAPTERS_ROOT, { recursive: true })

  const groups = GROUPS.map((g) => ({ ...g, chapters: [] }))
  const seenLinks = new Set()
  let pageCount = 0
  let skippedEmpty = 0

  for (const chapter of tree) {
    const group = groupOf(chapter.ordinal)
    const bucket = groups.find((g) => g.id === group.id)
    const dir = pad(chapter.ordinal)
    const dirPath = path.join(CHAPTERS_ROOT, dir)
    fs.mkdirSync(dirPath, { recursive: true })

    const mainLink = `/chapters/${dir}/`
    const mainBody = cleanBody(chapter.body)
    if (!mainBody) warnings.push(`第 ${chapter.ordinal} 篇正文为空：${chapter.title}`)

    if (seenLinks.has(mainLink)) throw new Error(`链接重复：${mainLink}`)
    seenLinks.add(mainLink)

    const mainPage = [
      frontmatter({
        title: chapter.title,
        ordinal: chapter.ordinal,
        group: group.text,
        bookTitle
      }),
      `# ${chapter.title}`,
      '',
      mainBody,
      ''
    ].filter((x) => x !== null).join('\n')

    fs.writeFileSync(path.join(dirPath, 'index.md'), `${mainPage}\n`, 'utf8')
    writtenTargets.push(`chapters/${dir}/index.md`)
    pageCount += 1

    const children = []
    for (const child of chapter.children) {
      const body = cleanBody(child.body)
      if (!body) {
        skippedEmpty += 1
        warnings.push(`空子章节（未生成页面）：${chapter.title} → ${child.title}`)
        continue
      }
      // 文件名与链接必须同步补零：文件是 01.md，链接就必须是 /01，
      // 否则带上 cleanUrls 后子页会出现 404。
      const slug = pad(children.length + 1)
      const file = `${slug}.md`
      const link = `/chapters/${dir}/${slug}`
      if (seenLinks.has(link)) throw new Error(`链接重复：${link}`)
      seenLinks.add(link)

      const page = [
        frontmatter({
          title: child.title,
          parent: chapter.title,
          parentLink: mainLink,
          ordinal: chapter.ordinal,
          group: group.text,
          bookTitle
        }),
        `# ${child.title}`,
        '',
        body,
        ''
      ].join('\n')
      fs.writeFileSync(path.join(dirPath, file), `${page}\n`, 'utf8')
      writtenTargets.push(`chapters/${dir}/${file}`)
      pageCount += 1
      children.push({ text: child.title, link, order: children.length + 1 })
    }

    const record = {
      ordinal: chapter.ordinal,
      title: chapter.title,
      text: chapter.title,
      link: mainLink,
      children
    }
    bucket.chapters.push(record)
  }

  // 译者附录：单独成部输出到 docs/appendix，不进入上面的章节树。
  const appendixRootLink = '/appendix/'
  const appendixSidebar = []
  const appendixFlat = []
  let appendixCount = 0

  if (appendix) {
    fs.mkdirSync(APPENDIX_ROOT, { recursive: true })

    const appendixIndexBody = cleanBody(appendix.body)
    if (seenLinks.has(appendixRootLink)) throw new Error(`链接重复：${appendixRootLink}`)
    seenLinks.add(appendixRootLink)

    const appendixIndex = [
      frontmatter({
        title: appendix.title,
        author: TRANSLATOR_APPENDIX.author,
        kind: 'translator-appendix',
        bookTitle
      }),
      `# ${appendix.title}`,
      '',
      `*${TRANSLATOR_APPENDIX.author} 撰*`,
      '',
      '::: tip 关于本篇',
      TRANSLATOR_APPENDIX.notice,
      ':::',
      '',
      appendixIndexBody,
      ''
    ].filter((x) => x !== null).join('\n')

    fs.writeFileSync(path.join(APPENDIX_ROOT, 'index.md'), `${appendixIndex}\n`, 'utf8')
    writtenTargets.push('appendix/index.md')
    appendixCount += 1

    const appendixChildren = []
    for (const child of appendix.children) {
      const body = cleanBody(child.body)
      if (!body) {
        skippedEmpty += 1
        warnings.push(`译者附录空小节（未生成页面）：${child.title}`)
        continue
      }
      const slug = pad(appendixChildren.length + 1)
      const link = `/appendix/${slug}`
      if (seenLinks.has(link)) throw new Error(`链接重复：${link}`)
      seenLinks.add(link)

      const page = [
        frontmatter({
          title: child.title,
          author: TRANSLATOR_APPENDIX.author,
          kind: 'translator-appendix',
          parent: appendix.title,
          parentLink: appendixRootLink,
          bookTitle
        }),
        `# ${child.title}`,
        '',
        `> 本篇为 ${TRANSLATOR_APPENDIX.author} 所撰《学习六部》总叙之一段，非原著正文，详见[附录总叙](${appendixRootLink})。`,
        '',
        body,
        ''
      ].join('\n')

      fs.writeFileSync(path.join(APPENDIX_ROOT, `${slug}.md`), `${page}\n`, 'utf8')
      writtenTargets.push(`appendix/${slug}.md`)
      appendixCount += 1
      appendixChildren.push({ text: child.title, link })
    }

    appendixFlat.push(
      { title: appendix.title, link: appendixRootLink, group: TRANSLATOR_APPENDIX.text, author: TRANSLATOR_APPENDIX.author, type: 'translator' },
      ...appendixChildren.map((child) => ({
        title: child.text,
        link: child.link,
        group: TRANSLATOR_APPENDIX.text,
        author: TRANSLATOR_APPENDIX.author,
        parent: appendix.title,
        type: 'translator'
      }))
    )

    appendixSidebar.push({
      text: TRANSLATOR_APPENDIX.text,
      collapsed: false,
      items: [
        { text: appendix.title, link: appendixRootLink },
        ...(appendixChildren.length
          ? [{ text: '四大段', collapsed: false, items: appendixChildren }]
          : [])
      ]
    })

    pageCount += appendixCount
  }

  const sidebar = groups.map((g) => ({
    text: g.text,
    collapsed: false,
    items: g.chapters.map((c) => {
      const item = { text: c.text, link: c.link }
      if (c.children.length) {
        item.collapsed = true
        item.items = c.children.map((child) => ({ text: child.text, link: child.link }))
      }
      return item
    })
  }))

  const flat = groups.flatMap((g) =>
    g.chapters.flatMap((c) => [
      { title: c.title, link: c.link, ordinal: c.ordinal, group: g.text, type: 'main' },
      ...c.children.map((child) => ({
        title: child.text,
        link: child.link,
        ordinal: c.ordinal,
        group: g.text,
        parent: c.title,
        type: 'appendix'
      }))
    ])
  )

  /**
   * 自检：每条 link 都必须落到真实存在的 md 文件上。
   * VitePress 开启 cleanUrls 后不做回退重试，链接写错（如补零不一致）会直接 404，
   * 因此在生成阶段就校验，避免坏链接流入站点。
   */
  const resolveLinkFile = (link) => {
    const rel = link.replace(/^\//, '').replace(/\/$/, '')
    const asDir = path.join(DOCS_ROOT, rel, 'index.md')
    const asFile = path.join(DOCS_ROOT, `${rel}.md`)
    if (fs.existsSync(asDir)) return asDir
    if (fs.existsSync(asFile)) return asFile
    return null
  }

  const broken = [...flat, ...appendixFlat].filter((item) => !resolveLinkFile(item.link))
  if (broken.length) {
    throw new Error(
      `以下 ${broken.length} 条链接没有对应页面文件（cleanUrls 下会 404）：\n` +
        broken.map((item) => `       - ${item.title} → ${item.link}`).join('\n')
    )
  }

  const summary = {
    bookTitle,
    mainCount: tree.length,
    pageCount,
    skippedEmpty,
    appendixCount
  }
  const dataFileContent = [
    '// 本文件由 scripts/split.mjs 自动生成，请勿手工修改；改动内容源后重跑 `npm run gen`。',
    `export const bookTitle = ${JSON.stringify(bookTitle)}`,
    `export const booksSummary = ${JSON.stringify(summary, null, 2)}`,
    `export const sidebar = ${JSON.stringify(sidebar, null, 2)}`,
    `export const chapters = ${JSON.stringify(flat, null, 2)}`,
    `export const translator = ${JSON.stringify(
      { author: TRANSLATOR_APPENDIX.author, text: TRANSLATOR_APPENDIX.text, notice: TRANSLATOR_APPENDIX.notice },
      null,
      2
    )}`,
    `export const appendixSidebar = ${JSON.stringify(appendixSidebar, null, 2)}`,
    `export const appendixChapters = ${JSON.stringify(appendixFlat, null, 2)}`,
    ''
  ].join('\n\n')

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.writeFileSync(DATA_FILE, dataFileContent, 'utf8')

  const stale = pruneStaleTargets(writtenTargets)
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(writtenTargets, null, 2)}\n`, 'utf8')

  const escaped = [...escapeStats.entries()].map(([k, v]) => `${k}×${v}`).join('，') || '无'
  console.log(`[gen] 书目：${bookTitle}`)
  console.log(`[gen] 主传 ${tree.length} 篇，生成页面 ${pageCount} 个，跳过空子章节 ${skippedEmpty} 个`)
  if (appendixCount) {
    console.log(
      `[gen] 译者附录单独成部：${TRANSLATOR_APPENDIX.author} 撰，${appendixCount} 个页面 → appendix/`
    )
  } else {
    console.log('[gen] 源文未检出译者附录')
  }
  console.log(`[gen] 行首转义：${escaped}`)
  if (warnings.length) {
    console.log(`[gen] 告警 ${warnings.length} 条：`)
    for (const w of warnings) console.log(`       - ${w}`)
  } else {
    console.log('[gen] 无告警')
  }
  console.log(`[gen] 侧边栏数据：${path.relative(process.cwd(), DATA_FILE)}`)
}

main()
