# lightbook · 电子书架

把中文佛学典籍按篇目拆成页面的静态电子书站，基于 [VitePress](https://vitepress.dev)。

源 md 平铺在 `sources/`（只读、不改动），每本书在 `books/<slug>/` 下放一份 `book.mjs` 配置；`npm run gen` 自动扫描并生成多本电子书，共同组成一个书架站点。

## 架上书目

| 书目 | 署名 | 构成 |
| --- | --- | --- |
| [菩提道次第师师相承传](/book/bodhi-path/) · 庄严圣教最胜宝鬘 | 耶喜绛称 著 · 郭和卿 译 | 84 篇祖师行传、54 篇附传，卷末译者附录 6 页 |
| [显密问答录](/book/xianmi/) | 济群法师 问 · 索达吉堪布 答 | 卷前 2 篇、正文 19 篇、附录 2 篇、卷末回向偈 |

## 站点特性

- **一书一部**：每本书占 `/book/<slug>/`，各有封面、全书目录、侧边栏与翻页序列；翻页与目录都不跨书。
- **全书成序列**：主传各自成页，其后的附传、琐记、年表作为该篇嵌套子页；《菩提道次第师师相承传》分为 5 个传承分组。
- **卷前／卷末单列**：缘起、前言一类置于编号篇目之前的文字归入「卷前」，回向偈一类归入「卷末」，不混入正文序号。
- **译者附录单列**：《菩提道次第师师相承传》卷末《学习六部》总叙为译者绛巴妥默（郭和卿）居士自撰，非原著正文，另行成部、标注撰者，不并入书目与页底翻页序列。
- **中文全文检索**：本地 MiniSearch 索引，中文按单字切分，支持人名、法名、地名查询，一次检索覆盖架上全部书目。
- **阅读设置**：宣纸、米黄、墨夜三种底色，字号、行距、字距自由调节，偏好保存在浏览器 localStorage。
- **纸质输出**：内置 `@media print` 样式，隐藏界面元素、单栏排印，可直接打印或导出 PDF。

## 本地运行

```bash
npm install
npm run gen     # 由 sources/ 下的源文生成 docs/book/<slug>/ 页面与站点数据
npm run dev     # 本地预览 http://localhost:5173/lightbook/
npm run build   # 输出到 docs/.vitepress/dist
npm run preview # 预览构建产物
```

> `npm run dev` / `npm run build` 都会先执行 `npm run gen`，保证页面与源文同步。
> 若构建时提示无法清空 `docs/.vitepress/dist`（受工具/平台的文件删除限制），手动删除该目录后重新构建即可。

## 目录结构

```
.
├── sources/                    # 源文区：各书 md 平铺于此，脚本只读不写
│   ├── 菩提道次第师承传-郭和卿译本(正文)-简体横排.md
│   └── 显密问答录.md
├── books/                      # 书籍配置区：脚本扫描 books/*/book.mjs 发现书目
│   ├── bodhi-path/book.mjs     # 书名、署名、简介、卷次分组、篇数自检
│   └── xianmi/book.mjs         # 另含卷前／卷末／附录的切分规则覆盖
├── scripts/
│   ├── book-config.mjs         # 路径常量、默认切分规则、loadBooks() 目录扫描
│   └── split.mjs               # 逐本构建：标题树解析 → 页面 → books.mjs
└── docs/
    ├── index.md                # 书架首页（卡片列出各书）
    ├── about.md                # 关于本站：书目、体例、加书步骤、版权
    └── book/                   # 生成：每书一目录
        └── <slug>/
            ├── index.md        # 生成：该书封面
            ├── contents.md     # 生成：该书全书目录
            ├── chapters/       # 生成：NN/index.md（主传）+ NN/MM.md（附传）
            ├── front/          # 生成：卷前（缘起、前言…）
            ├── tail/           # 生成：卷末（回向偈…）
            └── appendix/       # 生成：附录（index.md + NN.md），独立于书目
    └── .vitepress/
        ├── config.mts          # 站点配置（base、多书侧边栏、检索、导航）
        ├── data/books.mjs      # 生成：书目卡片、各书侧边栏与翻页序列
        ├── data/books.d.mts    # 生成数据的类型声明
        └── theme/              # 阅读主题：变量、版面、打印样式与四个组件
```

## 新增一本书

1. 把源 md 放进 `sources/`（平铺即可，文件名保持原样）。
2. 在 `books/` 下新建目录，如 `books/<slug>/`，写入 `book.mjs`：

   ```js
   export default {
     slug: 'my-book',                 // URL 段 → /book/my-book/
     source: '我的书.md',              // sources/ 下的文件名
     title: '我的书',
     subtitle: '副题',
     byline: '某某 著',
     description: '书架上显示的一两句简介。',
     intro: '封面页正文，可写 Markdown。',
     notice: '底本来源与录校说明。',
     expectedMainCount: 20            // 生成后自检篇数，不符即报错
   }
   ```

3. 若该书结构与默认规则不同，在 `book.mjs` 中覆盖（详见下节）。
4. 重跑 `npm run gen`，脚本自动发现新书，生成 `docs/book/<slug>/` 并挂上侧边栏与导航，无需改动 `config.mts`。

## 切分规则

判定顺序固定，命中即止；每一步的正则都可在 `book.mjs` 中覆盖，未覆盖则取 `scripts/book-config.mjs` 的默认值：

| 顺序 | 字段 | 默认 | 归入 |
| --- | --- | --- | --- |
| 1 | `tailTitleRe` | 无 | 卷末（如「回向偈」） |
| 2 | `frontTitleRe` | 无 | 卷前（如「缘起」「前言」，仅在正文篇目开始前判定） |
| 3 | `appendixTitleRe` | `/^附录[、，,:：]?\s*(.+)$/` | 附录一部（其后同级标题仍属附录） |
| 4 | `mainTitleRe` | `/^([一二三四五六七八九十百]+)、(.+)$/` | 新主传（需二级标题，且序号连续） |
| 5 | — | — | 其余标题归属当前篇的子页 |

其余可覆盖项：

- `requireSequential`（默认 `true`）：主传序号是否必须连续递增；
- `groups`（默认 `[]` 不分组、篇目平铺）：按卷次分组，形如 `{ id, text, note, range: [起, 止] }`；
- `escapeRules`（默认转义行首的 `>`、`#`、`-`、数字序号、`|`）；
- `translator`（默认 `null`）：声明后该书附录视为译者自撰，单独成序列、页首标注撰者。

其他约定：

- 正文为空的标题只记录告警，不生成页面（底本中个别附录仅有标题）；
- 正文逐行保留原貌，仅对行首会被 Markdown 误解析的字符做转义；
- 子页文件名与链接同步两位补零（文件 `01.md` ↔ 链接 `/01`），并在生成阶段校验每条链接都落到真实文件，避免 cleanUrls 下的 404。

调整分组边界或修改章节归属，请编辑对应 `books/<slug>/book.mjs` 后重跑 `npm run gen`。

## 发布

`base` 由 `docs/.vitepress/config.mts` 自动判定，无需手改：

| 部署环境 | 生效 base |
| --- | --- |
| Vercel / Cloudflare Pages（根域名） | `/` |
| GitHub / Gitee Pages（仓库子路径） | `/lightbook/` |
| 其他／需覆盖 | 设置环境变量 `SITE_BASE`，如 `SITE_BASE=/` 或 `SITE_BASE=/lightbook/` |

仓库已附带 `vercel.json`，指定 `buildCommand: npm run build` 与 `outputDirectory: docs/.vitepress/dist`；推送后 Vercel 按此构建即可。

### GitHub / Gitee Pages

仓库已附带 GitHub Actions 工作流 `.github/workflows/deploy.yml`：推送到 `main` 时构建并发布到 GitHub Pages。使用 Gitee Pages 时，可在本地构建后上传 `docs/.vitepress/dist` 内容，或在 Gitee 流水线中执行 `npm ci && npm run build`。

## 版权

各书原译本、原著述的著作权归原出版社及译者权利继承人所有；本站仅供个人学习研究使用，详见 `docs/about.md` 与仓库内 LICENSE。
