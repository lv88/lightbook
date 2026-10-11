<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { appendixChaptersByBook, books, chaptersByBook } from '../data/books.mjs'
import type { ChapterEntry as Entry } from '../data/books.mjs'

const props = defineProps<{ slug: string }>()

interface Group {
  name: string
  mains: Entry[]
  subs: Map<string, Entry[]>
}

const entries = computed<Entry[]>(() => chaptersByBook[props.slug] ?? [])
const appendixEntries = computed<Entry[]>(() => appendixChaptersByBook[props.slug] ?? [])
const translator = computed(() => books.find((book) => book.slug === props.slug)?.translator ?? null)

/** 按 group 聚合成「主篇 → 附篇」两级；卷前、卷末各自成组 */
const groups = computed<Group[]>(() => {
  const map = new Map<string, Group>()
  for (const entry of entries.value) {
    const name = entry.group ?? ''
    let group = map.get(name)
    if (!group) {
      group = { name, mains: [], subs: new Map() }
      map.set(name, group)
    }
    if (entry.kind !== 'sub') {
      group.mains.push(entry)
      group.subs.set(entry.link, [])
    }
  }
  for (const entry of entries.value) {
    if (entry.kind !== 'sub' || !entry.parent) continue
    for (const group of map.values()) {
      const main = group.mains.find((item) => item.title === entry.parent)
      if (main) {
        group.subs.get(main.link)?.push(entry)
        break
      }
    }
  }
  return [...map.values()]
})

const mainCount = computed(() => entries.value.filter((item) => item.kind === 'chapter').length)
const total = computed(() => entries.value.length + appendixEntries.value.length)

/** 生成数据中的链接不含 base，需补齐后才能直接作为 href 使用 */
const href = (link: string) => withBase(link)
</script>

<template>
  <div class="lb-book-contents">
    <p class="lb-count">
      本书共 {{ mainCount }} 篇正文，连卷前、附篇与卷末合计 {{ total }} 个篇目。
    </p>

    <section v-for="group in groups" :key="group.name" class="lb-toc-group">
      <h2 :id="group.name">{{ group.name }}</h2>
      <p class="lb-toc-note">{{ group.mains.length }} 篇</p>

      <div class="lb-toc-grid">
        <article v-for="main in group.mains" :key="main.link" class="lb-toc-card">
          <a :href="href(main.link)" class="lb-toc-title">{{ main.title }}</a>
          <span v-if="main.ordinal" class="lb-toc-meta">
            第 {{ main.ordinal }} 篇<template v-if="(group.subs.get(main.link) || []).length">
              · 附传 {{ (group.subs.get(main.link) || []).length }} 篇</template
            >
          </span>
          <div v-if="(group.subs.get(main.link) || []).length" class="lb-toc-sub">
            <a
              v-for="sub in group.subs.get(main.link)"
              :key="sub.link"
              :href="href(sub.link)"
              class="lb-toc-meta"
            >
              {{ sub.title }}
            </a>
          </div>
        </article>
      </div>
    </section>

    <section v-if="appendixEntries.length" class="lb-toc-group">
      <h2 :id="translator ? translator.text : '附录'">
        {{ translator ? translator.text : '附录' }}
      </h2>
      <p class="lb-toc-note">
        <template v-if="translator">{{ translator.author }} 撰 · 非原著正文</template>
        <template v-else>共 {{ appendixEntries.length }} 页 · 不计入正文篇目</template>
      </p>

      <div class="lb-toc-grid">
        <article v-for="item in appendixEntries" :key="item.link" class="lb-toc-card">
          <a :href="href(item.link)" class="lb-toc-title">{{ item.title }}</a>
          <span class="lb-toc-meta">
            {{ item.parent ? '附录之一节' : '附录' }}
          </span>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.lb-count {
  font-family: var(--lb-sans);
  font-size: 0.9em;
  color: var(--vp-c-text-2);
  margin-bottom: 0.5rem;
}

.lb-toc-sub {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-top: 0.3rem;
  padding-top: 0.3rem;
  border-top: 1px dashed var(--vp-c-divider);
}

.lb-toc-sub a {
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color var(--lb-transition);
}

.lb-toc-sub a:hover {
  color: var(--lb-cinnabar, #9e2b25);
}
</style>
