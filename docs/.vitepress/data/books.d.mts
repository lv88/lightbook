/** 由 scripts/split.mjs 生成的数据文件类型声明（仅用于类型提示，不参与打包）。 */

export interface SidebarItem {
  text: string
  link?: string
  collapsed?: boolean
  items?: SidebarItem[]
}

export interface BookStats {
  mainCount: number
  subCount: number
  frontCount: number
  tailCount: number
  appendixCount: number
  pageCount: number
}

export interface TranslatorInfo {
  author: string
  text: string
  notice: string
}

export interface BookCard {
  slug: string
  title: string
  subtitle: string
  byline: string
  description: string
  link: string
  contentsLink: string
  firstLink: string
  stats: BookStats
  translator: TranslatorInfo | null
}

export interface ChapterEntry {
  title: string
  link: string
  kind: 'front' | 'chapter' | 'sub' | 'tail' | 'appendix'
  ordinal?: number
  group?: string
  parent?: string
  author?: string | null
}

export declare const books: BookCard[]
export declare const sidebarByPath: Record<string, SidebarItem[]>
export declare const chaptersByBook: Record<string, ChapterEntry[]>
export declare const appendixChaptersByBook: Record<string, ChapterEntry[]>
export declare function bookByPath(path: string): BookCard | null
