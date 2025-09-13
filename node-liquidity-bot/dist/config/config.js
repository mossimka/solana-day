"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.txVersion = void 0;
exports.initSdk = initSdk;
const raydium_sdk_v2_1 = require("@raydium-io/raydium-sdk-v2");
exports.txVersion = 1;
async function initSdk(connection, owner, cluster) {
    const raydium = await raydium_sdk_v2_1.Raydium.load({
        connection,
        owner,
        cluster: cluster,
        disableFeatureCheck: true,
    });
    return raydium;
}
