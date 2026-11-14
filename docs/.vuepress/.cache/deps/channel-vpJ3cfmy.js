import { ot as Color, st as Utils } from "./chunk-DSNLSHJZ-CI1f2fku.js";
// node_modules/.pnpm/khroma@2.1.0/node_modules/khroma/dist/methods/channel.js
var channel = (color, channel) => {
	return Utils.lang.round(Color.parse(color)[channel]);
};
export { channel as t };
