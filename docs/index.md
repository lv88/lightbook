---
layout: home
title: lightbook 电子书架
description: 佛学典籍简体横排电子版，逐篇成页、可全文检索的静态电子书站。

hero:
  name: lightbook
  text: 电子书架
  tagline: 逐篇成页 · 全文检索 · 护眼排版
  actions:
    - theme: brand
      text: 浏览书目
      link: /book/bodhi-path/
    - theme: alt
      text: 关于本站
      link: /about

features:
  - title: 逐篇成页
    details: 每部书按篇目拆分为独立页面，卷前、正文、附传、卷末、附录各归其位；侧边栏按卷次脉络分组，页底「上一篇／下一篇」在本书内贯通。
  - title: 中文全文检索
    details: 本地 MiniSearch 索引，中文按单字切分，输入人名、法名、地名即可检得；一次检索覆盖架上全部书目。
  - title: 护眼排版与纸质输出
    details: 宣纸、米黄、墨夜三种底色，字号、行距、字距自由调节，偏好保存在本机；内置打印样式，可直接导出 PDF。
---

<script setup>
import BookShelf from './.vitepress/theme/BookShelf.vue'
</script>

## 架上书目

<BookShelf />

---

## 如何阅读

每本书都有独立的封面与全书目录：自封面进入，先看卷前的缘起、前言，再按篇目顺序递进；遇到附传可就近展开，不必回目录。页右下方「字」按钮调节字号、行距与底色，页右上「检索全书」逐字检索。
