import { ssrRenderAttrs, ssrRenderComponent } from "vue/server-renderer";
import { B as BookContents } from "./BookContents.hxArtAfD.js";
import { useSSRContext } from "vue";
import "./books.Fm6v0ZgD.js";
import "@vueuse/core";
import "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"显密问答录 · 全书目录","description":"","frontmatter":{"title":"显密问答录 · 全书目录","book":"xianmi","bookTitle":"显密问答录","kind":"contents","sidebar":false,"outline":false},"headers":[],"relativePath":"book/xianmi/contents.md","filePath":"book/xianmi/contents.md"}');
const __default__ = { name: "book/xianmi/contents.md" };
const _sfc_main = /* @__PURE__ */ Object.assign(__default__, {
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="全书目录" tabindex="-1">全书目录 <a class="header-anchor" href="#全书目录" aria-label="Permalink to &quot;全书目录&quot;">​</a></h1>`);
      _push(ssrRenderComponent(BookContents, { slug: "xianmi" }, null, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("book/xianmi/contents.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  __pageData,
  _sfc_main as default
};
