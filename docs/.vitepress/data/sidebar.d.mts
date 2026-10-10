/** 由 scripts/split.mjs 生成的数据文件类型声明（仅用于类型提示，不参与打包）。 */

export interface SidebarItem {
  text: string
  link?: string
  collapsed?: boolean
  items?: SidebarItem[]
}

export interface ChapterEntry {
  title: string
  link: string
  ordinal: number
  group: string
  parent?: string
  type: 'main' | 'appendix'
}

export interface BookSummary {
  bookTitle: string
  mainCount: number
  pageCount: number
  skippedEmpty: number
  appendixCount: number
}

export interface TranslatorInfo {
  author: string
  text: string
  notice: string
}

export interface AppendixEntry {
  title: string
  link: string
  group: string
  author: string
  parent?: string
  type: 'translator'
}

export declare const bookTitle: string
export declare const booksSummary: BookSummary
export declare const sidebar: SidebarItem[]
export declare const chapters: ChapterEntry[]
export declare const translator: TranslatorInfo
export declare const appendixSidebar: SidebarItem[]
export declare const appendixChapters: AppendixEntry[]
