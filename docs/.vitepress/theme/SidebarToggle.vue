<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

const STORAGE_KEY = 'lightbook-sidebar'

const { page } = useData()

/** true = 收起左侧本书目录 */
const hidden = ref(false)
/** 当前页没有侧边栏（首页、无目录页）时不显示按钮 */
const hasSidebar = ref(false)

function apply() {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('lb-sidebar-hidden', hidden.value)
}

function toggle() {
  hidden.value = !hidden.value
  apply()
  try {
    localStorage.setItem(STORAGE_KEY, hidden.value ? 'hidden' : 'shown')
  } catch (error) {
    console.error('[lightbook] 保存目录显隐失败', error)
  }
}

/** 侧边栏由路由配置决定，且路由切换后才挂载，需等 DOM 更新后再探测 */
function sync() {
  requestAnimationFrame(() => {
    hasSidebar.value = Boolean(document.querySelector('.VPSidebar'))
  })
}

onMounted(() => {
  try {
    hidden.value = localStorage.getItem(STORAGE_KEY) === 'hidden'
  } catch (error) {
    console.error('[lightbook] 读取目录显隐失败', error)
  }
  apply()
  sync()
})

watch(() => page.value.relativePath, sync, { flush: 'post' })
</script>

<template>
  <button
    v-if="hasSidebar"
    class="lb-sidebar-toggle"
    type="button"
    :class="{ 'is-off': hidden }"
    :aria-pressed="hidden"
    :title="hidden ? '显示本书目录' : '隐藏本书目录'"
    @click="toggle"
  >
    <span class="lb-sidebar-toggle-icon" aria-hidden="true">☰</span>
    <span class="lb-sidebar-toggle-text">目录</span>
  </button>
</template>

<style scoped>
.lb-sidebar-toggle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  height: 32px;
  margin-right: 0.35rem;
  padding: 0 0.6rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-family: var(--lb-sans);
  font-size: 13px;
  cursor: pointer;
  transition: border-color var(--lb-transition), color var(--lb-transition);
}

.lb-sidebar-toggle:hover {
  border-color: var(--lb-cinnabar, #9e2b25);
  color: var(--vp-c-text-1);
}

.lb-sidebar-toggle.is-off {
  color: var(--vp-c-text-3);
  border-style: dashed;
}

.lb-sidebar-toggle-icon {
  font-size: 12px;
  line-height: 1;
}

/* 窄屏下侧边栏是抽屉式，不做收起 */
@media (max-width: 959px) {
  .lb-sidebar-toggle {
    display: none;
  }
}
</style>
