<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { appendixChapters, chapters, translator } from '../data/sidebar.mjs'

interface Group {
  name: string
  mains: (typeof chapters)[number][]
  appendices: Map<string, (typeof chapters)[number][]>
}

const groups = computed<Group[]>(() => {
  const map = new Map<string, Group>()
  for (const entry of chapters) {
    let group = map.get(entry.group)
    if (!group) {
      group = { name: entry.group, mains: [], appendices: new Map() }
      map.set(entry.group, group)
    }
    if (entry.type === 'main') {
      group.mains.push(entry)
      group.appendices.set(entry.link, [])
    }
  }
  for (const entry of chapters) {
    if (entry.type !== 'appendix' || !entry.parent) continue
    for (const group of map.values()) {
      const main = group.mains.find((item) => item.title === entry.parent)
      if (main) {
        group.appendices.get(main.link)?.push(entry)
        break
      }
    }
  }
  return [...map.values()]
})

const total = computed(() => chapters.length)

/** 译者附录不计入原著书目，单独列示 */
const appendixTop = computed(() => appendixChapters[0])
const appendixRest = computed(() => appendixChapters.slice(1))

/** 生成数据中的链接不含 base，需补齐后才能直接作为 href 使用 */
const href = (link: string) => withBase(link)
</script>

<template>
  <div class="lb-book-contents">
    <p class="lb-count">
      全书共 {{ chapters.filter((c) => c.type === 'main').length }} 篇祖师行传，
      连附传合计 {{ total }} 个篇目。
    </p>

    <section v-for="group in groups" :key="group.name" class="lb-toc-group">
      <h2 :id="group.name">{{ group.name }}</h2>
      <p class="lb-toc-note">{{ group.mains.length }} 篇</p>

      <div class="lb-toc-grid">
        <article v-for="main in group.mains" :key="main.link" class="lb-toc-card">
          <a :href="href(main.link)" class="lb-toc-title">{{ main.title }}</a>
          <span class="lb-toc-meta">
            第 {{ main.ordinal }} 篇 · 附传
            {{ (group.appendices.get(main.link) || []).length }} 篇
          </span>
          <div v-if="(group.appendices.get(main.link) || []).length" class="lb-toc-sub">
            <a
              v-for="sub in group.appendices.get(main.link)"
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

    <section v-if="appendixTop" class="lb-toc-group">
      <h2 :id="translator.text">{{ translator.text }}</h2>
      <p class="lb-toc-note">{{ translator.author }} 撰 · 非原著正文</p>

      <div class="lb-toc-grid">
        <article class="lb-toc-card">
          <a :href="href(appendixTop.link)" class="lb-toc-title">{{ appendixTop.title }}</a>
          <span class="lb-toc-meta">附录 · 共 {{ appendixChapters.length }} 页</span>
          <div v-if="appendixRest.length" class="lb-toc-sub">
            <a
              v-for="sub in appendixRest"
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
