<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { books } from '../data/books.mjs'

/** 卡片底部的篇目统计：按书的实际构成拼接 */
const statText = (book: (typeof books)[number]): string => {
  const { mainCount, subCount, appendixCount, pageCount } = book.stats
  const parts = [`${mainCount} 篇`]
  if (subCount) parts.push(`附篇 ${subCount} 篇`)
  if (appendixCount) parts.push(`附录 ${appendixCount} 页`)
  parts.push(`共 ${pageCount} 页`)
  return parts.join(' · ')
}

const cards = computed(() => books)

/** 生成数据中的链接不含 base，需补齐后才能直接作为 href 使用 */
const href = (link: string) => withBase(link)
</script>

<template>
  <div class="lb-shelf">
    <article v-for="book in cards" :key="book.slug" class="lb-shelf-card">
      <header class="lb-shelf-head">
        <h3 class="lb-shelf-title">
          <a :href="href(book.link)">{{ book.title }}</a>
        </h3>
        <p v-if="book.subtitle" class="lb-shelf-sub">{{ book.subtitle }}</p>
        <p v-if="book.byline" class="lb-shelf-byline">{{ book.byline }}</p>
      </header>

      <p class="lb-shelf-desc">{{ book.description }}</p>

      <footer class="lb-shelf-foot">
        <span class="lb-shelf-meta">{{ statText(book) }}</span>
        <span class="lb-shelf-links">
          <a :href="href(book.firstLink)">开始阅读 ⟶</a>
          <a :href="href(book.contentsLink)">全书目录</a>
        </span>
      </footer>
    </article>
  </div>
</template>
