<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

type ReadingTheme = 'paper' | 'sepia' | 'dark'

interface ReadingPrefs {
  fontSize: number
  lineHeight: number
  letterSpacing: number
  theme: ReadingTheme
}

const STORAGE_KEY = 'lightbook-reading'
const THEMES: { value: ReadingTheme; label: string; swatch: string }[] = [
  { value: 'paper', label: '宣纸', swatch: '#fbf7ef' },
  { value: 'sepia', label: '米黄', swatch: '#f4e8ce' },
  { value: 'dark', label: '墨夜', swatch: '#141210' }
]

const DEFAULTS: ReadingPrefs = {
  fontSize: 17,
  lineHeight: 1.9,
  letterSpacing: 0.02,
  theme: 'paper'
}

const { isDark } = useData()

const open = ref(false)
const panelRef = ref<HTMLElement | null>(null)
const fontSize = ref(DEFAULTS.fontSize)
const lineHeight = ref(DEFAULTS.lineHeight)
const letterSpacing = ref(DEFAULTS.letterSpacing)
const theme = ref<ReadingTheme>(DEFAULTS.theme)

const prefs = computed<ReadingPrefs>(() => ({
  fontSize: fontSize.value,
  lineHeight: lineHeight.value,
  letterSpacing: letterSpacing.value,
  theme: theme.value
}))

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs.value))
  } catch (error) {
    console.error('[lightbook] 保存阅读偏好失败', error)
  }
}

function applyToDocument() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--lb-font-size', `${fontSize.value}px`)
  root.style.setProperty('--lb-line-height', String(lineHeight.value))
  root.style.setProperty('--lb-letter-spacing', `${letterSpacing.value}em`)
  root.setAttribute('data-reading-theme', theme.value === 'sepia' ? 'sepia' : 'paper')
}

function apply() {
  applyToDocument()
  const wantDark = theme.value === 'dark'
  if (Boolean(isDark.value) !== wantDark) isDark.value = wantDark
  persist()
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as Partial<ReadingPrefs>
    if (typeof saved.fontSize === 'number') fontSize.value = saved.fontSize
    if (typeof saved.lineHeight === 'number') lineHeight.value = saved.lineHeight
    if (typeof saved.letterSpacing === 'number') letterSpacing.value = saved.letterSpacing
    if (saved.theme === 'paper' || saved.theme === 'sepia' || saved.theme === 'dark') {
      theme.value = saved.theme
    }
  } catch (error) {
    console.error('[lightbook] 读取阅读偏好失败', error)
  }
}

function reset() {
  fontSize.value = DEFAULTS.fontSize
  lineHeight.value = DEFAULTS.lineHeight
  letterSpacing.value = DEFAULTS.letterSpacing
  theme.value = DEFAULTS.theme
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value) return
  const target = event.target as Node | null
  if (panelRef.value && target && !panelRef.value.contains(target)) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

watch(prefs, apply)

watch(isDark, (value) => {
  if (value && theme.value !== 'dark') theme.value = 'dark'
  if (!value && theme.value === 'dark') theme.value = 'paper'
})

onMounted(() => {
  readStored()
  apply()
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="lb-reading-settings">
    <button
      class="lb-reading-button"
      type="button"
      aria-label="阅读设置"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span aria-hidden="true">字</span>
    </button>

    <Transition name="lb-panel">
      <section
        v-if="open"
        ref="panelRef"
        class="lb-panel"
        role="dialog"
        aria-label="阅读设置"
      >
        <h3 class="lb-panel-title">阅读设置</h3>

        <div class="lb-field">
          <label for="lb-font-size">
            <span>字号</span><b>{{ fontSize }}px</b>
          </label>
          <input
            id="lb-font-size"
            v-model.number="fontSize"
            type="range"
            min="15"
            max="23"
            step="1"
          />
        </div>

        <div class="lb-field">
          <label for="lb-line-height">
            <span>行距</span><b>{{ lineHeight.toFixed(2) }}</b>
          </label>
          <input
            id="lb-line-height"
            v-model.number="lineHeight"
            type="range"
            min="1.6"
            max="2.4"
            step="0.05"
          />
        </div>

        <div class="lb-field">
          <label for="lb-letter-spacing">
            <span>字距</span><b>{{ letterSpacing.toFixed(3) }}em</b>
          </label>
          <input
            id="lb-letter-spacing"
            v-model.number="letterSpacing"
            type="range"
            min="0"
            max="0.08"
            step="0.005"
          />
        </div>

        <div class="lb-themes" role="radiogroup" aria-label="配色">
          <button
            v-for="item in THEMES"
            :key="item.value"
            class="lb-theme-chip"
            type="button"
            role="radio"
            :aria-checked="theme === item.value"
            :class="{ 'is-active': theme === item.value }"
            @click="theme = item.value"
          >
            <i class="lb-swatch" :style="{ background: item.swatch }" />
            {{ item.label }}
          </button>
        </div>

        <footer class="lb-panel-footer">
          <span class="lb-hint">偏好保存在本机浏览器</span>
          <button class="lb-reset" type="button" @click="reset">恢复默认</button>
        </footer>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.lb-reading-settings {
  position: fixed;
  right: 1.4rem;
  bottom: 1.6rem;
  z-index: 60;
}

.lb-reading-button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-elv);
  color: var(--lb-cinnabar, #9e2b25);
  font-family: var(--lb-serif);
  font-size: 17px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transition: transform var(--lb-transition), box-shadow var(--lb-transition);
}

.lb-reading-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
}

.lb-panel {
  position: absolute;
  right: 0;
  bottom: 56px;
  width: 260px;
  padding: 1rem 1.1rem 0.9rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 14px;
  background: var(--vp-c-bg-elv);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.16);
  font-family: var(--lb-sans);
}

.lb-panel-title {
  margin: 0 0 0.9rem;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--vp-c-text-1);
}

.lb-field {
  margin-bottom: 0.85rem;
}

.lb-field label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-bottom: 0.35rem;
}

.lb-field label b {
  font-weight: 600;
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
}

.lb-field input[type='range'] {
  width: 100%;
  height: 18px;
  margin: 0;
  accent-color: var(--lb-cinnabar, #9e2b25);
  cursor: pointer;
}

.lb-themes {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.2rem;
}

.lb-theme-chip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.4rem 0;
  font-size: 12px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: border-color var(--lb-transition), color var(--lb-transition);
}

.lb-theme-chip.is-active {
  border-color: var(--lb-cinnabar, #9e2b25);
  color: var(--vp-c-text-1);
}

.lb-swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid var(--vp-c-border);
}

.lb-panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.9rem;
  padding-top: 0.7rem;
  border-top: 1px solid var(--vp-c-divider);
}

.lb-hint {
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.lb-reset {
  border: none;
  background: none;
  color: var(--lb-cinnabar, #9e2b25);
  font-size: 12px;
  cursor: pointer;
}

.lb-panel-enter-active,
.lb-panel-leave-active {
  transition: opacity var(--lb-transition), transform var(--lb-transition);
}

.lb-panel-enter-from,
.lb-panel-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

@media (max-width: 640px) {
  .lb-reading-settings {
    right: 1rem;
    bottom: 1rem;
  }
}
</style>
