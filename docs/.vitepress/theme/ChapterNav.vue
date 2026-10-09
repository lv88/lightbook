<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute, withBase } from 'vitepress'
import { chapters } from '../data/sidebar.mjs'

const route = useRoute()
const { site, frontmatter } = useData()

/** 当前页面链接，统一去掉 base 与尾部斜杠后与书目数据比对 */
const currentLink = computed(() => {
  const base = site.value.base || '/'
  let path = route.path.replace(/\.html$/, '')
  if (base !== '/' && path.startsWith(base)) path = path.slice(base.length)
  if (!path.startsWith('/')) path = `/${path}`
  return path.replace(/\/$/, '')
})

const index = computed(() =>
  chapters.findIndex((item) => item.link.replace(/\/$/, '') === currentLink.value)
)

const prev = computed(() => (index.value > 0 ? chapters[index.value - 1] : null))
const next = computed(() =>
  index.value >= 0 && index.value < chapters.length - 1
    ? chapters[index.value + 1]
    : null
)

const parent = computed(() => {
  const title = frontmatter.value.parent
  const link = frontmatter.value.parentLink
  return title && link ? { title, link } : null
})

/** 书目数据与常量链接都不含 base，需补齐后才能作为 href */
const href = (link: string) => withBase(link)
</script>

<template>
  <nav v-if="prev || next || parent" class="lb-chapter-nav" aria-label="章节导航">
    <p v-if="parent" class="lb-parent">
      本篇：<a :href="href(parent.link)">{{ parent.title }}</a>
    </p>

    <div class="lb-nav-row">
      <a v-if="prev" class="lb-nav-card is-prev" :href="href(prev.link)">
        <span class="lb-nav-desc">上一篇</span>
        <span class="lb-nav-title">{{ prev.title }}</span>
      </a>
      <span v-else class="lb-nav-card is-empty"><span class="lb-nav-desc">已是卷首</span></span>

      <a v-if="next" class="lb-nav-card is-next" :href="href(next.link)">
        <span class="lb-nav-desc">下一篇</span>
        <span class="lb-nav-title">{{ next.title }}</span>
      </a>
      <span v-else class="lb-nav-card is-empty is-right">
        <span class="lb-nav-desc">已是卷末</span>
      </span>
    </div>

    <p class="lb-nav-toc">
      <a :href="href('/contents')">全书目录</a>
    </p>
  </nav>
</template>

<style scoped>
.lb-chapter-nav {
  margin: 3rem 0 1rem;
  padding-top: 1.4rem;
  border-top: 1px solid var(--vp-c-divider);
  font-family: var(--lb-sans);
}

.lb-parent {
  margin: 0 0 1rem;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.lb-parent a {
  color: var(--lb-cinnabar, #9e2b25);
  border-bottom: 1px solid transparent;
  text-decoration: none;
}

.lb-nav-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.lb-nav-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.85rem 1rem;
  min-height: 76px;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: border-color var(--lb-transition), transform var(--lb-transition);
}

a.lb-nav-card:hover {
  border-color: var(--lb-cinnabar, #9e2b25);
  transform: translateY(-2px);
  cursor: pointer;
}

.lb-nav-card.is-right,
a.lb-nav-card.is-next {
  text-align: right;
}

.lb-nav-card.is-empty {
  align-items: flex-start;
  justify-content: center;
  background: transparent;
  border-style: dashed;
  color: var(--vp-c-text-3);
}

.lb-nav-desc {
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--vp-c-text-3);
}

.lb-nav-title {
  font-family: var(--lb-serif);
  font-size: 14px;
  line-height: 1.6;
}

.lb-nav-toc {
  margin: 1rem 0 0;
  font-size: 12px;
  text-align: center;
}

.lb-nav-toc a {
  color: var(--vp-c-text-2);
  text-decoration: none;
  border-bottom: 1px solid var(--vp-c-divider);
}

@media (max-width: 640px) {
  .lb-nav-row {
    grid-template-columns: 1fr;
  }

  a.lb-nav-card.is-next {
    text-align: left;
  }
}
</style>
