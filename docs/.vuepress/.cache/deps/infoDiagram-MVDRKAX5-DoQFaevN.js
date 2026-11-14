import { n as __name } from "./chunk-Y2CYZVJY-B_GF4Sdy.js";
import { z as log } from "./src-BbGPHZ5B.js";
import { c as configureSvgSize } from "./chunk-DSNLSHJZ-CI1f2fku.js";
import { t as selectSvgElement } from "./chunk-OYAV6JZA-B1W2W1Tm.js";
import { n as parse } from "./mermaid-parser.core-AWfGRT-5.js";
// node_modules/.pnpm/mermaid@12.2.0/node_modules/mermaid/dist/chunks/mermaid.core/infoDiagram-MVDRKAX5.mjs
var parser = { parse: /* @__PURE__ */ __name(async (input) => {
	const ast = await parse("info", input);
	log.debug(ast);
}, "parse") };
var DEFAULT_INFO_DB = { version: "12.2.0" };
var diagram = {
	parser,
	db: { getVersion: /* @__PURE__ */ __name(() => DEFAULT_INFO_DB.version, "getVersion") },
	renderer: { draw: /* @__PURE__ */ __name((text, id, version) => {
		log.debug("rendering info diagram\n" + text);
		const svg = selectSvgElement(id);
		configureSvgSize(svg, 100, 400, true);
		svg.append("g").append("text").attr("x", 100).attr("y", 40).attr("class", "version").attr("font-size", 32).style("text-anchor", "middle").text(`v${version}`);
	}, "draw") }
};
export { diagram };
