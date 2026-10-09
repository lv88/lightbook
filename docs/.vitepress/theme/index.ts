import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import ChapterNav from './ChapterNav.vue'
import ReadingSettings from './ReadingSettings.vue'

import './styles/vars.css'
import './styles/layout.css'
import './styles/print.css'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'layout-top': () => h(ReadingSettings),
      'doc-footer-before': () => h(ChapterNav)
    })
} satisfies Theme
