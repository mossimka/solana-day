"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWalletFromSecretKey = createWalletFromSecretKey;
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
function createWalletFromSecretKey(secretKey) {
    try {
        const secretKeyBytes = bs58_1.default.decode(secretKey);
        return web3_js_1.Keypair.fromSecretKey(secretKeyBytes);
    }
    catch (error) {
        console.error('Failed to create wallet from base58 secret key:', error);
        throw new Error('Invalid base58 secret key provided.');
    }
}
