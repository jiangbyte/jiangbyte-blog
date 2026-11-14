import { n as __name } from "./chunk-Y2CYZVJY-B_GF4Sdy.js";
import { z as log } from "./src-BbGPHZ5B.js";
import { s as common_default, y as getConfig } from "./chunk-DSNLSHJZ-CI1f2fku.js";
import { f as interpolateToCurve } from "./chunk-7S6XSTFO-WZU3UN0V.js";
import { t as insertLookDefs } from "./chunk-DUW6YSOI-Cv5feoaI.js";
import { o as labelHelper } from "./chunk-HAGFOTED-_U9OqoCR.js";
import { r as insertNode } from "./chunk-ZAUX2LTX-BV9J8XUK.js";
import { r as insertCluster } from "./chunk-HNE4Q36P-DjzJK4S9.js";
import { a as insertEdgeLabel, c as markers_default, i as insertEdge, l as positionEdgeLabel } from "./chunk-WQQL4CDK-BLiIr925.js";
// node_modules/.pnpm/mermaid@12.2.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-EJLWFMJV.mjs
var internalHelpers = {
	common: common_default,
	getConfig,
	insertCluster,
	insertEdge,
	insertEdgeLabel,
	insertMarkers: markers_default,
	insertNode,
	interpolateToCurve,
	labelHelper,
	log,
	positionEdgeLabel
};
var ELK_ALGORITHMS = [
	"elk.stress",
	"elk.force",
	"elk.mrtree",
	"elk.sporeOverlap",
	"elk.box",
	"elk.rectpacking"
];
var layoutAlgorithms = /* @__PURE__ */ Object.create(null);
var registerLayoutLoaders = /* @__PURE__ */ __name((loaders) => {
	for (const loader of loaders) layoutAlgorithms[loader.name] = loader;
}, "registerLayoutLoaders");
var elkLayoutLoaders = /* @__PURE__ */ __name(() => {
	const loader = /* @__PURE__ */ __name(async () => await import("./elk-QONTBCTQ-D9lhPG-g.js"), "loader");
	return [{
		name: "elk",
		loader,
		algorithm: "elk.layered"
	}, ...ELK_ALGORITHMS.map((algorithm) => ({
		name: algorithm,
		loader,
		algorithm
	}))];
}, "elkLayoutLoaders");
(/* @__PURE__ */ __name(() => {
	registerLayoutLoaders([
		{
			name: "dagre",
			loader: /* @__PURE__ */ __name(async () => await import("./dagre-NK4GIZVX-6zENTv6r.js"), "loader")
		},
		{
			name: "swimlane",
			loader: /* @__PURE__ */ __name(async () => await import("./swimlanes-B3ENRKFQ-CO6H8Mh2.js"), "loader")
		},
		...[{
			name: "cose-bilkent",
			loader: /* @__PURE__ */ __name(async () => await import("./cose-bilkent-JH36ORCC-Dnr5WF6N.js"), "loader")
		}, ...elkLayoutLoaders()]
	]);
}, "registerDefaultLayoutLoaders"))();
var render = /* @__PURE__ */ __name(async (data4Layout, svg) => {
	if (!Object.hasOwn(layoutAlgorithms, data4Layout.layoutAlgorithm)) throw new Error(`Unknown layout algorithm: ${data4Layout.layoutAlgorithm}`);
	if (data4Layout.diagramId) for (const node of data4Layout.nodes) {
		const originalDomId = node.domId || node.id;
		node.domId = `${data4Layout.diagramId}-${originalDomId}`;
	}
	const layoutDefinition = layoutAlgorithms[data4Layout.layoutAlgorithm];
	const layoutRenderer = await layoutDefinition.loader();
	insertLookDefs(svg, data4Layout.config);
	return layoutRenderer.render(data4Layout, svg, internalHelpers, { algorithm: layoutDefinition.algorithm });
}, "render");
var LAST_RESORT_LAYOUT = "dagre";
var getRegisteredLayoutAlgorithm = /* @__PURE__ */ __name((algorithm = "", { fallback = LAST_RESORT_LAYOUT } = {}) => {
	if (Object.hasOwn(layoutAlgorithms, algorithm)) return algorithm;
	for (const candidate of [fallback, LAST_RESORT_LAYOUT]) if (Object.hasOwn(layoutAlgorithms, candidate)) {
		log.warn(`Layout algorithm ${algorithm} is not registered. Using ${candidate} as fallback.`);
		return candidate;
	}
	throw new Error(`Neither layout algorithm ${algorithm}, ${fallback}, nor ${LAST_RESORT_LAYOUT} is registered.`);
}, "getRegisteredLayoutAlgorithm");
export { registerLayoutLoaders as n, render as r, getRegisteredLayoutAlgorithm as t };
