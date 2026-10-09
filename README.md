# lightbook · 菩提道次第师师相承传

《菩提道次第师师相承传——庄严圣教最胜宝鬘》（耶喜绛称 著，郭和卿 译，简体横排）的静态电子书站，基于 [VitePress](https://vitepress.dev) 构建。

## 站点特性

- **全书成序列**：84 篇主传各自成页，其后的附传、琐记、年表作为该篇嵌套子页，共 137 个篇目、5 个传承分组。
- **目录与翻页**：侧边栏按传承脉络分组（广行派 / 深观派 / 阿底峡与噶当派 / 宗喀巴法脉 / 后期传承师资），页底有「上一篇／下一篇」贯通全书，另有全书总目录页。
- **中文全文检索**：本地 MiniSearch 索引（约 0.6 MB），中文按单字切分，支持人名、法名、地名查询。
- **阅读设置**：宣纸、米黄、墨夜三种底色，字号、行距、字距自由调节，偏好保存在浏览器 localStorage。
- **纸质输出**：内置 `@media print` 样式，隐藏界面元素、单栏排印，可直接打印或导出 PDF。

## 本地运行

```bash
npm install
npm run gen     # 由根目录源 md 生成 docs/chapters 页面与侧边栏数据
npm run dev     # 本地预览 http://localhost:5173/lightbook/
npm run build   # 输出到 docs/.vitepress/dist
npm run preview # 预览构建产物
```

> `npm run dev` / `npm run build` 都会先执行 `npm run gen`，保证页面与源同步。
> 若构建时提示无法清空 `docs/.vitepress/dist`（受工具/平台的文件删除限制），手动删除该目录后重新构建即可。

## 目录结构

```
.
├── 菩提道次第师承传-郭和卿译本(正文)-简体横排.md   # 数据源（不改动）
├── scripts/
│   ├── split.mjs          # 切分脚本：标题树解析 → 页面 → sidebar.mjs
│   └── book-config.mjs    # 源文件路径、卷次分组、清洗规则
└── docs/
    ├── index.md            # 封面首页
    ├── contents.md         # 全书目录
    ├── about.md            # 译本说明与录校体例
    ├── chapters/           # 生成：NN/index.md（主传）+ NN/MM.md（附传）
    └── .vitepress/
        ├── config.mts      # 站点配置（base /lightbook/、检索、导航）
        ├── data/sidebar.mjs# 生成：章节树与扁平书目
        └── theme/          # 阅读主题：变量、版面、打印样式与两个组件
```

### 切分规则

- 二级标题形如「一、…」且序号连续 → 新主传章节，写入 `docs/chapters/NN/index.md`；
- 其余二级标题（附一、琐记、年表…）与所有三级标题 → 归属最近主传，写入 `NN/MM.md`；
- 正文为空的标题只记录告警，不生成页面（底本中个别附录仅有标题）；
- 正文逐行保留原貌，仅对行首会被 Markdown 误解析的字符做转义。

调整分组边界或修改章节归属，请编辑 `scripts/book-config.mjs` 后重跑 `npm run gen`。

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

原译本著作权归原出版社及译者权利继承人所有；本站仅供个人学习研究使用，详见 `docs/about.md` 与仓库内 LICENSE。
