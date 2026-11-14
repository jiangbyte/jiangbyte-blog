import { n as __name } from "./chunk-Y2CYZVJY-B_GF4Sdy.js";
import { R as select_default } from "./src-BbGPHZ5B.js";
// node_modules/.pnpm/mermaid@12.2.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-XXDRQBXY.mjs
var getDiagramElement = /* @__PURE__ */ __name((id, securityLevel) => {
	let sandboxElement;
	if (securityLevel === "sandbox") sandboxElement = select_default("#i" + id);
	return (securityLevel === "sandbox" ? select_default(sandboxElement.nodes()[0].contentDocument.body) : select_default("body")).select(`[id="${id}"]`);
}, "getDiagramElement");
export { getDiagramElement as t };
