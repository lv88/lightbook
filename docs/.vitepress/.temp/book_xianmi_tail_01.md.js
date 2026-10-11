import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"回向偈","description":"","frontmatter":{"book":"xianmi","bookTitle":"显密问答录","byline":"济群法师 问 · 索达吉堪布 答","title":"回向偈","kind":"tail"},"headers":[],"relativePath":"book/xianmi/tail/01.md","filePath":"book/xianmi/tail/01.md"}');
const _sfc_main = { name: "book/xianmi/tail/01.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="回向偈" tabindex="-1">回向偈 <a class="header-anchor" href="#回向偈" aria-label="Permalink to &quot;回向偈&quot;">​</a></h1><p>愿以此功德　　庄严佛净土 上报四重恩　　下济三途苦 若有见闻者　　悉发菩提心 尽此一报身　　同生极乐国</p><p>十方三世一切佛 一切菩萨摩诃萨 摩诃般若波罗蜜</p><hr></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("book/xianmi/tail/01.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _01 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _01 as default
};
