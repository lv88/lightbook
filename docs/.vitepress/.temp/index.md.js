import { ssrRenderAttrs, ssrRenderList, ssrRenderAttr, ssrInterpolate, ssrRenderComponent } from "vue/server-renderer";
import { defineComponent, computed, mergeProps, useSSRContext } from "vue";
import { b as books, w as withBase } from "./books.Fm6v0ZgD.js";
import "@vueuse/core";
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "BookShelf",
  __ssrInlineRender: true,
  setup(__props) {
    const statText = (book) => {
      const { mainCount, subCount, appendixCount, pageCount } = book.stats;
      const parts = [`${mainCount} 篇`];
      if (subCount) parts.push(`附篇 ${subCount} 篇`);
      if (appendixCount) parts.push(`附录 ${appendixCount} 页`);
      parts.push(`共 ${pageCount} 页`);
      return parts.join(" · ");
    };
    const cards = computed(() => books);
    const href = (link) => withBase(link);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "lb-shelf" }, _attrs))}><!--[-->`);
      ssrRenderList(cards.value, (book) => {
        _push(`<article class="lb-shelf-card"><header class="lb-shelf-head"><h3 class="lb-shelf-title"><a${ssrRenderAttr("href", href(book.link))}>${ssrInterpolate(book.title)}</a></h3>`);
        if (book.subtitle) {
          _push(`<p class="lb-shelf-sub">${ssrInterpolate(book.subtitle)}</p>`);
        } else {
          _push(`<!---->`);
        }
        if (book.byline) {
          _push(`<p class="lb-shelf-byline">${ssrInterpolate(book.byline)}</p>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</header><p class="lb-shelf-desc">${ssrInterpolate(book.description)}</p><footer class="lb-shelf-foot"><span class="lb-shelf-meta">${ssrInterpolate(statText(book))}</span><span class="lb-shelf-links"><a${ssrRenderAttr("href", href(book.firstLink))}>开始阅读 ⟶</a><a${ssrRenderAttr("href", href(book.contentsLink))}>全书目录</a></span></footer></article>`);
      });
      _push(`<!--]--></div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add(".vitepress/theme/BookShelf.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const __pageData = JSON.parse('{"title":"lightbook 电子书架","description":"佛学典籍简体横排电子版，逐篇成页、可全文检索的静态电子书站。","frontmatter":{"layout":"home","title":"lightbook 电子书架","description":"佛学典籍简体横排电子版，逐篇成页、可全文检索的静态电子书站。","hero":{"name":"lightbook","text":"电子书架","tagline":"逐篇成页 · 全文检索 · 护眼排版","actions":[{"theme":"brand","text":"浏览书目","link":"/book/bodhi-path/"},{"theme":"alt","text":"关于本站","link":"/about"}]},"features":[{"title":"逐篇成页","details":"每部书按篇目拆分为独立页面，卷前、正文、附传、卷末、附录各归其位；侧边栏按卷次脉络分组，页底「上一篇／下一篇」在本书内贯通。"},{"title":"中文全文检索","details":"本地 MiniSearch 索引，中文按单字切分，输入人名、法名、地名即可检得；一次检索覆盖架上全部书目。"},{"title":"护眼排版与纸质输出","details":"宣纸、米黄、墨夜三种底色，字号、行距、字距自由调节，偏好保存在本机；内置打印样式，可直接导出 PDF。"}]},"headers":[],"relativePath":"index.md","filePath":"index.md"}');
const __default__ = { name: "index.md" };
const _sfc_main = /* @__PURE__ */ Object.assign(__default__, {
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}><h2 id="架上书目" tabindex="-1">架上书目 <a class="header-anchor" href="#架上书目" aria-label="Permalink to &quot;架上书目&quot;">​</a></h2>`);
      _push(ssrRenderComponent(_sfc_main$1, null, null, _parent));
      _push(`<hr><h2 id="如何阅读" tabindex="-1">如何阅读 <a class="header-anchor" href="#如何阅读" aria-label="Permalink to &quot;如何阅读&quot;">​</a></h2><p>每本书都有独立的封面与全书目录：自封面进入，先看卷前的缘起、前言，再按篇目顺序递进；遇到附传可就近展开，不必回目录。页右下方「字」按钮调节字号、行距与底色，页右上「检索全书」逐字检索。</p></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  __pageData,
  _sfc_main as default
};
