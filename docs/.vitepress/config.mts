import { defineConfig } from 'vitepress'
import { bookTitle, sidebar } from './data/sidebar.mjs'

/**
 * 部署基路径：Vercel 部署在域名根路径，GitHub / Gitee Pages 部署在 /<repo>/ 子路径。
 * 可用 SITE_BASE 环境变量显式指定（如 SITE_BASE=/ 或 SITE_BASE=/lightbook/）。
 */
const resolveBase = (): string => {
  const fromEnv = process.env.SITE_BASE
  if (fromEnv) {
    return fromEnv.endsWith('/') ? fromEnv : `${fromEnv}/`
  }
  return process.env.VERCEL || process.env.CF_PAGES ? '/' : '/lightbook/'
}

const base = resolveBase()

const SITE_TITLE = '菩提道次第师师相承传'
const SITE_DESC =
  '《菩提道次第师师相承传——庄严圣教最胜宝鬘》郭和卿译本简体横排电子版：八十四篇祖师行传、附传与全圆道体师承脉络。'

/**
 * 阅读偏好的首帧应用脚本：在首屏渲染前把已保存的字号、行距、主题写进 <html>，
 * 避免深色 / 护眼模式切换时的闪白。
 */
const READING_PREF_BOOTSTRAP = `(function(){try{var s=JSON.parse(localStorage.getItem('lightbook-reading')||'{}'),r=document.documentElement;if(s.fontSize)r.style.setProperty('--lb-font-size',s.fontSize+'px');if(s.lineHeight)r.style.setProperty('--lb-line-height',String(s.lineHeight));if(s.letterSpacing)r.style.setProperty('--lb-letter-spacing',s.letterSpacing+'em');if(s.theme)r.setAttribute('data-reading-theme',s.theme);}catch(e){}})()`

/**
 * 中文分词：中文串按单字切出（查询词同样切分，命中即相关），
 * 拉丁字母与数字按词切出。函数必须自包含——VitePress 会把 siteData 中的函数
 * 序列化到客户端求值，无法携带闭包变量。
 */
const tokenize = (text: string): string[] => {
  const tokens: string[] = []
  const cjk = new RegExp('[\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF\\u3040-\\u30FF]')
  const parts = String(text)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue
    if (!cjk.test(part)) {
      tokens.push(part)
      continue
    }
    for (let j = 0; j < part.length; j++) tokens.push(part[j])
  }
  return tokens
}

export default defineConfig({
  base,
  lang: 'zh-CN',
  title: SITE_TITLE,
  description: SITE_DESC,
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
    ['meta', { name: 'theme-color', content: '#9e2b25' }],
    ['meta', { name: 'author', content: '耶喜绛称 著 · 郭和卿 译' }],
    ['meta', { property: 'og:title', content: `${SITE_TITLE}——庄严圣教最胜宝鬘` }],
    ['meta', { property: 'og:description', content: SITE_DESC }],
    ['script', {}, READING_PREF_BOOTSTRAP]
  ],
  markdown: {
    lineNumbers: false
  },
  themeConfig: {
    nav: [
      { text: '封面', link: '/' },
      { text: '全书目录', link: '/contents' },
      { text: '关于本书', link: '/about' }
    ],
    sidebar: {
      '/chapters/': sidebar
    },
    outline: {
      level: [2, 3],
      label: '本篇大纲'
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    sidebarMenuLabel: '全书篇目',
    returnToTopLabel: '回到顶部',
    darkModeSwitchLabel: '深浅色',
    lightModeSwitchTitle: '切换到浅色（宣纸）',
    darkModeSwitchTitle: '切换到深色（墨夜）',
    skipToContentLabel: '跳到正文',
    footer: {
      message: '',
      copyright: `${bookTitle} · 郭和卿译本 · 简体横排电子版`
    },
    search: {
      provider: 'local',
      options: {
        detailedView: 'auto',
        translations: {
          button: {
            buttonText: '检索全书',
            buttonAriaLabel: '检索全书'
          },
          modal: {
            displayDetails: '显示详细列表',
            resetButtonTitle: '清除检索条件',
            backButtonTitle: '关闭检索',
            noResultsText: '未检得',
            footer: {
              selectText: '打开',
              selectKeyAriaLabel: '回车键',
              navigateText: '上下浏览',
              navigateUpKeyAriaLabel: '向上箭头',
              navigateDownKeyAriaLabel: '向下箭头',
              closeText: '关闭',
              closeKeyAriaLabel: '退出键'
            }
          }
        },
        miniSearch: {
          options: {
            tokenize
          },
          searchOptions: {
            combineWith: 'AND',
            fuzzy: false,
            prefix: false,
            boost: { title: 8, titles: 3, text: 1 }
          }
        }
      }
    }
  }
})
