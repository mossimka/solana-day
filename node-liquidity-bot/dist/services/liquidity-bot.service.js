"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiquidityBotService = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const web3_js_1 = require("@solana/web3.js");
const raydium_sdk_v2_1 = require("@raydium-io/raydium-sdk-v2");
const spl_token_1 = require("@solana/spl-token");
const decimal_js_1 = require("decimal.js");
const axios_1 = __importDefault(require("axios"));
const cron = __importStar(require("node-cron"));
const bn_js_1 = require("bn.js");
const solana_utils_1 = require("../utils/solana.utils");
const config_1 = require("../config/config");
const raydium_utils_1 = require("../utils/raydium.utils");
class LiquidityBotService {
    constructor(positionRepository, sessionWalletRepository, cryptoService) {
        this.currentOwnerPk = null;
        this.cachedPairs = [];
        this.lastCacheTime = 0;
        this.CLMM_PROGRAM_ID = new web3_js_1.PublicKey('CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK');
        this.positionRepository = positionRepository;
        this.sessionWalletRepository = sessionWalletRepository;
        this.cryptoService = cryptoService;
        const coinMarketCapApiKey = process.env.COINMARKETCAP_API_KEY;
        const birdeyeApiKey = process.env.BIRDEYE_API_KEY;
        const moralisApiKey = process.env.MORALIS_API_KEY;
        const scannerHost = process.env.SCANNER_HOST;
        if (!coinMarketCapApiKey || !birdeyeApiKey || !moralisApiKey || !scannerHost) {
            throw new Error('CRITICAL: One or more required API keys or HOSTs are not configured in .env file!');
        }
        this.coinMarketCapApiKey = coinMarketCapApiKey;
        this.birdeyeApiKey = birdeyeApiKey;
        this.moralisApiKey = moralisApiKey;
        this.scannerHost = scannerHost;
        this.analyticsServiceHost = process.env.ANALYTICS_SERVICE_HOST || 'http://127.0.0.1:8000';
        this.cluster = 'mainnet';
        const rpcUrl = 'https://mainnet.helius-rpc.com/?api-key=ec7871b0-d394-4763-a453-02b32dfe92f8';
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
        console.log(`Initialized with RPC: ${rpcUrl}`);
        this.initializeCronJobs();
    }
    initializeCronJobs() {
        console.log('LiquidityBotService initialized. Scheduling cron jobs...');
        this.schedulePoolPopulation();
    }
    schedulePoolPopulation() {
        cron.schedule('0 0 * * *', () => {
            console.log('CRON JOB: Starting scheduled execution of populate-pools script...');
            const projectRoot = path.join(__dirname, '..', '..');
            const command = 'npm run populate-pools';
            (0, child_process_1.exec)(command, { cwd: projectRoot }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`CRON JOB FAILED: Error executing populate-pools script: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.log(`CRON JOB STDERR: ${stderr}`);
                }
                console.log(`CRON JOB SUCCESS: populate-pools script finished successfully.`);
                console.log(`CRON JOB STDOUT: ${stdout}`);
            });
        }, {
            timezone: "Asia/Almaty"
        });
        console.log('Successfully scheduled the populate-pools script to run daily at midnight (Almaty time).');
    }
    async getOwnerKeypair() {
        const walletRecords = await this.sessionWalletRepository.find({
            order: {
                created_at: 'DESC',
            },
            take: 1,
        });
        const latestWallet = walletRecords.length > 0 ? walletRecords[0] : null;
        if (!latestWallet) {
            throw new Error('Private key is not set. Please save a private key first.');
        }
        const decryptedSecret = this.cryptoService.decrypt(latestWallet.encrypted_key, latestWallet.iv);
        return (0, solana_utils_1.createWalletFromSecretKey)(decryptedSecret);
    }
    async initialize(owner) {
        var _a;
        if (this.raydium && ((_a = this.currentOwnerPk) === null || _a === void 0 ? void 0 : _a.equals(owner.publicKey))) {
            return;
        }
        try {
            this.raydium = await (0, config_1.initSdk)(this.connection, owner, this.cluster);
            this.currentOwnerPk = owner.publicKey;
            console.log(`Raydium SDK initialized for wallet: ${owner.publicKey.toBase58()}`);
        }
        catch (error) {
            console.error(`Failed to initialize Raydium SDK: ${String(error)}`);
            throw error;
        }
    }
    async savePrivateKey(privateKey) {
        if (!privateKey) {
            throw new Error('Private key cannot be empty.');
        }
        const { iv, encryptedData } = this.cryptoService.encrypt(privateKey);
        await this.sessionWalletRepository.clear();
        const newWalletRecord = this.sessionWalletRepository.create({
            encrypted_key: encryptedData,
            iv: iv,
        });
        await this.sessionWalletRepository.save(newWalletRecord);
        console.log('A new private key has been encrypted and saved.');
    }
    async getPoolInfo(poolId) {
        if (!this.raydium) {
            this.raydium = await raydium_sdk_v2_1.Raydium.load({ connection: this.connection, disableFeatureCheck: true });
        }
        try {
            const rpcData = await this.raydium.clmm.getRpcClmmPoolInfo({ poolId });
            return rpcData;
        }
        catch (error) {
            console.error(`Failed to fetch pool info for poolId ${poolId}: ${error.message}`);
            throw new Error('Unable to fetch pool info');
        }
    }
    async setupLiquidityPosition(params, hedgePlan) {
        var _a, _b;
        const owner = await this.getOwnerKeypair();
        await this.initialize(owner);
        const poolId = params.poolId;
        const data = await this.raydium.api.fetchPoolById({ ids: poolId });
        const poolInfo = data[0];
        if (!(0, raydium_utils_1.isValidClmm)(poolInfo.programId)) {
            throw new Error('Target pool is not a CLMM pool');
        }
        const rpcData = await this.raydium.clmm.getRpcClmmPoolInfo({ poolId: poolInfo.id });
        const currentPrice = rpcData.currentPrice;
        const percent = params.priceRangePercent / 100;
        const startPrice = currentPrice * (1 - percent);
        const endPrice = currentPrice * (1 + percent);
        if (currentPrice < startPrice || currentPrice > endPrice) {
            throw new Error(`Current price (${currentPrice}) is outside the specified range [${startPrice}, ${endPrice}].`);
        }
        const { tick: lowerTick } = raydium_sdk_v2_1.TickUtils.getPriceAndTick({ poolInfo, price: new decimal_js_1.Decimal(startPrice), baseIn: true });
        const { tick: upperTick } = raydium_sdk_v2_1.TickUtils.getPriceAndTick({ poolInfo, price: new decimal_js_1.Decimal(endPrice), baseIn: true });
        const epochInfo = await this.raydium.fetchEpochInfo();
        const res = await raydium_sdk_v2_1.PoolUtils.getLiquidityAmountOutFromAmountIn({
            poolInfo, slippage: 0.5, inputA: true,
            tickUpper: Math.max(lowerTick, upperTick), tickLower: Math.min(lowerTick, upperTick),
            amount: new bn_js_1.BN(new decimal_js_1.Decimal(params.inputAmount).mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
            add: true, amountHasFee: true, epochInfo,
        });
        const { execute, extInfo } = await this.raydium.clmm.openPositionFromBase({
            poolInfo, poolKeys: undefined,
            tickUpper: Math.max(lowerTick, upperTick), tickLower: Math.min(lowerTick, upperTick),
            base: 'MintA', ownerInfo: { useSOLBalance: true },
            baseAmount: new bn_js_1.BN(new decimal_js_1.Decimal(params.inputAmount).mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
            otherAmountMax: res.amountSlippageB.amount,
            txVersion: config_1.txVersion, computeBudgetConfig: { units: 600000, microLamports: 100000 }, nft2022: true
        });
        const { txId } = await execute({ sendAndConfirm: true });
        const positionId = extInfo.nftMint.toBase58();
        let openFeeUSD = 0;
        try {
            const txDetails = await this.connection.getTransaction(txId, { maxSupportedTransactionVersion: 0 });
            if (txDetails && txDetails.meta) {
                const feeInLamports = txDetails.meta.fee;
                const feeInSol = feeInLamports / 1000000000;
                const solPriceData = await this.getTokenPrices('SOL');
                const solPrice = solPriceData['SOL'] || 0;
                openFeeUSD = feeInSol * solPrice;
                console.log(`Transaction fee for opening ${positionId}: ${feeInSol} SOL (${openFeeUSD.toFixed(4)} USD)`);
            }
        }
        catch (error) {
            console.error(`Failed to fetch transaction fee for ${txId}: ${error.message}`);
        }
        const { position: positionInfoData } = await this.positionInfo(positionId, owner);
        const symbolA = poolInfo.mintA.symbol === 'WSOL' ? 'SOL' : poolInfo.mintA.symbol;
        const symbolB = poolInfo.mintB.symbol === 'WSOL' ? 'SOL' : poolInfo.mintB.symbol;
        const prices = await this.getTokenPrices(`${symbolA},${symbolB}`);
        const initialPriceA = prices[symbolA] || 0;
        const initialPriceB = prices[symbolB] || 0;
        const initialValue = (params.inputAmount * initialPriceA) + (Number(positionInfoData.quoteAmount) * initialPriceB);
        const position = this.positionRepository.create({
            positionId,
            poolId: params.poolId,
            hedgeExchange: params.exchange,
            initialBaseAmount: params.inputAmount.toString(),
            initialQuoteAmount: positionInfoData.quoteAmount,
            initialPriceA, initialPriceB, initialValue,
            startPrice, endPrice,
            hedgePlan: hedgePlan,
            transactionCosts: openFeeUSD,
        });
        await this.positionRepository.save(position);
        try {
            const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(positionId);
            if (params.strategyType === 'DELTA_NEUTRAL') {
                console.log(`Strategy is DELTA_NEUTRAL. Calling the specialized endpoint on ${exchangePrefix}.`);
                const payload = {
                    positionId: positionId,
                    pairName: `${params.baseMint}/${params.quoteMint}`,
                    totalValue: initialValue,
                    isSimulation: false,
                    legs: hedgePlan === null || hedgePlan === void 0 ? void 0 : hedgePlan.legs,
                };
                if (!payload.legs || !Array.isArray(payload.legs) || payload.legs.length === 0) {
                    throw new Error('Hedge leg information is required for DELTA_NEUTRAL strategy.');
                }
                await axios_1.default.post(`http://${futuresHost}/${exchangePrefix}/hedging/start-dual-delta-neutral`, payload);
            }
            else {
                console.log(`Using default GRID/DUAL_GRID hedging logic on ${exchangePrefix}.`);
                if (!hedgePlan || !hedgePlan.strategyType || !hedgePlan.legs || hedgePlan.legs.length === 0) {
                    throw new Error('Invalid or missing hedgePlan for GRID strategy. Cannot start hedge.');
                }
                const payload = {
                    positionId: positionId,
                    pairName: hedgePlan.pairName,
                    totalValue: initialValue.toString(),
                    range: { lower: startPrice.toString(), upper: endPrice.toString() },
                    hedgePlan: hedgePlan,
                };
                await axios_1.default.post(`http://${futuresHost}/${exchangePrefix}/hedging/start`, payload);
            }
            console.log(`Successfully notified futures service to start hedging for ${positionId}.`);
        }
        catch (error) {
            let errorMessage = 'An unknown error occurred';
            if (axios_1.default.isAxiosError(error)) {
                errorMessage = ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message;
            }
            else if (error instanceof Error) {
                errorMessage = error.message;
            }
            console.error(`Failed to notify futures service for position ${positionId}: ${errorMessage}`);
            throw new Error(`On-chain position created, but hedge start failed: ${errorMessage}`);
        }
        return { status: 'success', mint: positionId, txId: txId };
    }
    async closePosition(nftMint) {
        const owner = await this.getOwnerKeypair();
        await this.initialize(owner);
        console.log(`Attempting to close position using API-FETCHED pool info for NFT: ${nftMint}`);
        const positionNftMint = new web3_js_1.PublicKey(nftMint);
        const allPositions = await this.raydium.clmm.getOwnerPositionInfo({ programId: this.CLMM_PROGRAM_ID });
        const positionData = allPositions.find((p) => p.nftMint.equals(positionNftMint));
        if (!positionData) {
            throw new Error(`Position ${nftMint} not found.`);
        }
        console.log(`Fetching RICH pool info from Raydium API for pool: ${positionData.poolId.toBase58()}`);
        const apiPoolData = await this.raydium.api.fetchPoolById({ ids: positionData.poolId.toBase58() });
        if (!apiPoolData || apiPoolData.length === 0) {
            throw new Error(`Could not fetch pool info from Raydium API for pool ${positionData.poolId.toBase58()}`);
        }
        const poolInfo = apiPoolData[0];
        const { poolKeys } = await this.raydium.clmm.getPoolInfoFromRpc(positionData.poolId.toBase58());
        if (!positionData.liquidity.isZero()) {
            console.log('STEP 1: Decreasing liquidity with API-provided poolInfo.');
            try {
                const { execute: executeDecrease } = await this.raydium.clmm.decreaseLiquidity({
                    poolInfo,
                    poolKeys,
                    ownerPosition: positionData,
                    ownerInfo: { useSOLBalance: true, closePosition: false },
                    liquidity: positionData.liquidity,
                    amountMinA: new bn_js_1.BN(0),
                    amountMinB: new bn_js_1.BN(0),
                    txVersion: config_1.txVersion,
                    computeBudgetConfig: { units: 800000, microLamports: 100000 },
                });
                const { txId } = await executeDecrease({ sendAndConfirm: true });
                console.log(`Liquidity decreased successfully. TX: ${txId}`);
            }
            catch (error) {
                console.error('STEP 1 FAILED: Could not decrease liquidity.', error);
                throw error;
            }
        }
        else {
            console.log('STEP 1 SKIPPED: Position liquidity is already zero.');
        }
        console.log('STEP 2: Closing the empty position account.');
        try {
            const finalPositions = await this.raydium.clmm.getOwnerPositionInfo({ programId: this.CLMM_PROGRAM_ID });
            const positionToClose = finalPositions.find((p) => p.nftMint.equals(positionNftMint));
            if (!positionToClose) {
                console.warn(`Position ${nftMint} not found after decreasing liquidity, it might be already closed.`);
                await this.positionRepository.delete({ positionId: nftMint });
                return { txId: 'N/A - already closed', success: true };
            }
            const { execute: executeClose } = await this.raydium.clmm.closePosition({
                poolInfo,
                poolKeys,
                ownerPosition: positionToClose,
                txVersion: config_1.txVersion,
                computeBudgetConfig: { units: 100000, microLamports: 100000 },
            });
            const { txId } = await executeClose({ sendAndConfirm: true });
            console.log(`Position account closed successfully. TX: ${txId}`);
            await this.positionRepository.delete({ positionId: nftMint });
            console.log(`Position ${nftMint} removed from local database.`);
            try {
                const payload = { positionId: nftMint };
                const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(nftMint);
                await axios_1.default.post(`http://${futuresHost}/${exchangePrefix}/hedging/stop`, payload);
            }
            catch (e) {
                console.error('Failed to notify futures service');
            }
            return { txId, success: true };
        }
        catch (error) {
            console.error('STEP 2 FAILED: Could not close the position account.', error);
            throw error;
        }
    }
    async getBalanceByPool(poolId) {
        var _a, _b, _c, _d;
        const owner = await this.getOwnerKeypair();
        await this.initialize(owner);
        try {
            const publicKey = owner.publicKey;
            const data = await this.raydium.api.fetchPoolById({ ids: poolId });
            const poolInfo = data[0];
            const mintA = poolInfo.mintA;
            const mintB = poolInfo.mintB;
            const symbolA = ((_a = poolInfo.mintA) === null || _a === void 0 ? void 0 : _a.symbol) === 'WSOL' ? 'SOL' : (_b = poolInfo.mintA) === null || _b === void 0 ? void 0 : _b.symbol;
            const symbolB = ((_c = poolInfo.mintB) === null || _c === void 0 ? void 0 : _c.symbol) === 'WSOL' ? 'SOL' : (_d = poolInfo.mintB) === null || _d === void 0 ? void 0 : _d.symbol;
            const tokenAAta = await (0, spl_token_1.getAssociatedTokenAddress)(new web3_js_1.PublicKey(mintA.address), publicKey);
            const tokenBAta = await (0, spl_token_1.getAssociatedTokenAddress)(new web3_js_1.PublicKey(mintB.address), publicKey);
            let amountA = 0;
            let amountB = 0;
            try {
                if (mintA.symbol === 'WSOL') {
                    amountA = (await this.connection.getBalance(publicKey)) / (10 ** mintA.decimals);
                }
                else {
                    const account = await (0, spl_token_1.getAccount)(this.connection, tokenAAta);
                    amountA = Number(account.amount) / (10 ** mintA.decimals);
                }
            }
            catch (e) {
                amountA = 0;
            }
            try {
                if (mintB.symbol === 'WSOL') {
                    amountB = (await this.connection.getBalance(publicKey)) / (10 ** mintB.decimals);
                }
                else {
                    const account = await (0, spl_token_1.getAccount)(this.connection, tokenBAta);
                    amountB = Number(account.amount) / (10 ** mintB.decimals);
                }
            }
            catch (e) {
                amountB = 0;
            }
            const symbols = [symbolA, symbolB].filter(Boolean).join(',');
            const prices = await this.getTokenPrices(symbols);
            const priceA = prices[symbolA] || 0;
            const priceB = prices[symbolB] || 0;
            return {
                [symbolA]: { amount: amountA, valueInUSD: amountA * priceA },
                [symbolB]: { amount: amountB, valueInUSD: amountB * priceB },
            };
        }
        catch (error) {
            console.error(`Failed to fetch balance for pool ${poolId}: ${error.message}`);
            throw new Error(`Unable to fetch balance: ${error.message}`);
        }
    }
    async getTokenPrices(symbols) {
        var _a;
        const cachedPrices = {};
        const symbolsToFetch = [];
        symbols.split(',').forEach((symbol) => {
            symbolsToFetch.push(symbol);
        });
        if (symbolsToFetch.length === 0) {
            return cachedPrices;
        }
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await axios_1.default.get(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest`, {
                    params: {
                        symbol: symbolsToFetch.join(','),
                    },
                    headers: {
                        'X-CMC_PRO_API_KEY': this.coinMarketCapApiKey,
                    },
                });
                symbolsToFetch.forEach((symbol) => {
                    var _a, _b, _c, _d, _e, _f;
                    const priceData = (_f = (_e = (_d = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b[symbol]) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.quote) === null || _e === void 0 ? void 0 : _e.USD) === null || _f === void 0 ? void 0 : _f.price;
                    if (priceData) {
                        const price = parseFloat(priceData);
                        cachedPrices[symbol] = price;
                    }
                    else {
                        console.warn(`Price not found for ${symbol} on CoinMarketCap`);
                        cachedPrices[symbol] = 0;
                    }
                });
                return cachedPrices;
            }
            catch (error) {
                if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 429 && attempt < 3) {
                    console.warn(`Rate limit exceeded for CoinMarketCap, retrying (${attempt}/3)`);
                    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
                    continue;
                }
                console.error(`Failed to fetch prices for ${symbols} from CoinMarketCap: ${error.message}`, error.stack);
                symbolsToFetch.forEach((symbol) => {
                    cachedPrices[symbol] = 0;
                });
                return cachedPrices;
            }
        }
        return cachedPrices;
    }
    async positionInfo(nftMint, owner) {
        const currentOwner = owner || await this.getOwnerKeypair();
        await this.initialize(currentOwner);
        const positionNftMint = new web3_js_1.PublicKey(nftMint);
        const positionPubKey = (0, raydium_sdk_v2_1.getPdaPersonalPositionAddress)(raydium_sdk_v2_1.CLMM_PROGRAM_ID, positionNftMint).publicKey;
        const pos = await this.raydium.connection.getAccountInfo(positionPubKey);
        if (!pos)
            throw new Error('Position not found');
        const position = raydium_sdk_v2_1.PositionInfoLayout.decode(pos.data);
        let poolInfo;
        if (this.cluster === 'mainnet') {
            poolInfo = (await this.raydium.api.fetchPoolById({ ids: position.poolId.toBase58() }))[0];
        }
        else {
            const data = await this.raydium.clmm.getPoolInfoFromRpc(position.poolId.toBase58());
            poolInfo = data.poolInfo;
        }
        const epochInfo = await this.raydium.connection.getEpochInfo();
        const priceLower = raydium_sdk_v2_1.TickUtils.getTickPrice({ poolInfo, tick: position.tickLower, baseIn: true });
        const priceUpper = raydium_sdk_v2_1.TickUtils.getTickPrice({ poolInfo, tick: position.tickUpper, baseIn: true });
        const { amountA, amountB } = raydium_sdk_v2_1.PositionUtils.getAmountsFromLiquidity({
            poolInfo,
            ownerPosition: position,
            liquidity: position.liquidity,
            slippage: 0,
            add: false,
            epochInfo,
        });
        const [pooledAmountA, pooledAmountB] = [
            new decimal_js_1.Decimal(amountA.amount.toString()).div(10 ** poolInfo.mintA.decimals).toString(),
            new decimal_js_1.Decimal(amountB.amount.toString()).div(10 ** poolInfo.mintB.decimals).toString(),
        ];
        const rpcPoolData = await this.raydium.clmm.getRpcClmmPoolInfo({ poolId: position.poolId });
        const currentPrice = rpcPoolData.currentPrice;
        const positionInfoData = {
            positionId: positionNftMint.toBase58(),
            baseAmount: pooledAmountA,
            quoteAmount: pooledAmountB,
            priceRange: { lower: Number(priceLower.price), upper: Number(priceUpper.price) },
            currentPrice: currentPrice,
            profitability: 0,
            actionHistory: [],
            poolKeys: { id: position.poolId.toBase58() },
        };
        const poolInfoResponse = {
            poolId: position.poolId.toBase58(),
            baseMint: poolInfo.mintA.symbol,
            quoteMint: poolInfo.mintB.symbol,
            currentPrice: currentPrice,
        };
        return { position: positionInfoData, pool: poolInfoResponse };
    }
    async fetchAllPositions() {
        const owner = await this.getOwnerKeypair();
        await this.initialize(owner);
        console.log('Fetching all user positions from the database...');
        const positionRecords = await this.positionRepository.find();
        if (!positionRecords || positionRecords.length === 0) {
            console.log('No positions found in the database.');
            return { positions: [], pools: [] };
        }
        const positions = [];
        const pools = {};
        for (const record of positionRecords) {
            try {
                if (record.positionId.startsWith('test-')) {
                    const fakePositionInfo = {
                        positionId: record.positionId,
                        baseAmount: record.initialBaseAmount,
                        quoteAmount: record.initialQuoteAmount,
                        priceRange: { lower: record.startPrice, upper: record.endPrice },
                        currentPrice: record.initialPriceA,
                        profitability: 0,
                        actionHistory: ["Created in Test Mode"],
                        poolKeys: { id: record.poolId },
                        initialValue: record.initialValue,
                    };
                    positions.push(fakePositionInfo);
                    if (!pools[record.poolId]) {
                        pools[record.poolId] = { poolId: record.poolId, baseMint: "SOL", quoteMint: "USDC", currentPrice: record.initialPriceA };
                    }
                }
                else {
                    const { position: freshPositionData, pool } = await this.fetchPositionInfo(record.positionId, owner);
                    const finalPositionData = Object.assign(Object.assign({}, freshPositionData), { initialValue: record.initialValue });
                    positions.push(finalPositionData);
                    if (!pools[pool.poolId]) {
                        pools[pool.poolId] = pool;
                    }
                }
            }
            catch (error) {
                if (error.message === 'Position not found') {
                    console.warn(`Position ${record.positionId} is in DB but not on-chain. Hiding from response (likely rebalancing).`);
                }
                else {
                    console.error(`Could not process position ${record.positionId}: ${error.message}`);
                }
            }
        }
        console.log(`Successfully processed and returning ${positions.length} positions.`);
        return { positions, pools: Object.values(pools) };
    }
    async fetchPositionInfo(nftMint, owner) {
        const currentOwner = owner || await this.getOwnerKeypair();
        await this.initialize(currentOwner);
        const positionNftMint = new web3_js_1.PublicKey(nftMint);
        const positionPubKey = (0, raydium_sdk_v2_1.getPdaPersonalPositionAddress)(raydium_sdk_v2_1.CLMM_PROGRAM_ID, positionNftMint).publicKey;
        const pos = await this.connection.getAccountInfo(positionPubKey);
        if (!pos)
            throw new Error('Position not found');
        const position = raydium_sdk_v2_1.PositionInfoLayout.decode(pos.data);
        let poolInfo;
        if (this.raydium.cluster === 'mainnet') {
            poolInfo = (await this.raydium.api.fetchPoolById({ ids: position.poolId.toBase58() }))[0];
        }
        else {
            const data = await this.raydium.clmm.getPoolInfoFromRpc(position.poolId.toBase58());
            poolInfo = data.poolInfo;
        }
        const epochInfo = await this.connection.getEpochInfo();
        const priceLower = raydium_sdk_v2_1.TickUtils.getTickPrice({ poolInfo, tick: position.tickLower, baseIn: true });
        const priceUpper = raydium_sdk_v2_1.TickUtils.getTickPrice({ poolInfo, tick: position.tickUpper, baseIn: true });
        const { amountA, amountB } = raydium_sdk_v2_1.PositionUtils.getAmountsFromLiquidity({
            poolInfo,
            ownerPosition: position,
            liquidity: position.liquidity,
            slippage: 0,
            add: false,
            epochInfo,
        });
        const [pooledAmountA, pooledAmountB] = [
            new decimal_js_1.Decimal(amountA.amount.toString()).div(10 ** poolInfo.mintA.decimals).toString(),
            new decimal_js_1.Decimal(amountB.amount.toString()).div(10 ** poolInfo.mintB.decimals).toString(),
        ];
        const [tickLowerArrayAddress, tickUpperArrayAddress] = [
            raydium_sdk_v2_1.TickUtils.getTickArrayAddressByTick(new web3_js_1.PublicKey(poolInfo.programId), new web3_js_1.PublicKey(poolInfo.id), position.tickLower, poolInfo.config.tickSpacing),
            raydium_sdk_v2_1.TickUtils.getTickArrayAddressByTick(new web3_js_1.PublicKey(poolInfo.programId), new web3_js_1.PublicKey(poolInfo.id), position.tickUpper, poolInfo.config.tickSpacing),
        ];
        const tickArrayRes = await this.connection.getMultipleAccountsInfo([tickLowerArrayAddress, tickUpperArrayAddress]);
        if (!tickArrayRes[0] || !tickArrayRes[1])
            throw new Error('Tick data not found');
        const tickArrayLower = raydium_sdk_v2_1.TickArrayLayout.decode(tickArrayRes[0].data);
        const tickArrayUpper = raydium_sdk_v2_1.TickArrayLayout.decode(tickArrayRes[1].data);
        const tickLowerState = tickArrayLower.ticks[raydium_sdk_v2_1.TickUtils.getTickOffsetInArray(position.tickLower, poolInfo.config.tickSpacing)];
        const tickUpperState = tickArrayUpper.ticks[raydium_sdk_v2_1.TickUtils.getTickOffsetInArray(position.tickUpper, poolInfo.config.tickSpacing)];
        const rpcPoolData = await this.raydium.clmm.getRpcClmmPoolInfo({ poolId: position.poolId });
        const tokenFees = raydium_sdk_v2_1.PositionUtils.GetPositionFeesV2(rpcPoolData, position, tickLowerState, tickUpperState);
        const [tokenFeeAmountA, tokenFeeAmountB] = [
            tokenFees.tokenFeeAmountA.gte(new bn_js_1.BN(0)) && tokenFees.tokenFeeAmountA.lt(raydium_sdk_v2_1.U64_IGNORE_RANGE)
                ? tokenFees.tokenFeeAmountA
                : new bn_js_1.BN(0),
            tokenFees.tokenFeeAmountB.gte(new bn_js_1.BN(0)) && tokenFees.tokenFeeAmountB.lt(raydium_sdk_v2_1.U64_IGNORE_RANGE)
                ? tokenFees.tokenFeeAmountB
                : new bn_js_1.BN(0),
        ];
        const [feeAmountA, feeAmountB] = [
            new decimal_js_1.Decimal(tokenFeeAmountA.toString()).div(10 ** poolInfo.mintA.decimals).toNumber(),
            new decimal_js_1.Decimal(tokenFeeAmountB.toString()).div(10 ** poolInfo.mintB.decimals).toNumber(),
        ];
        const rewards = raydium_sdk_v2_1.PositionUtils.GetPositionRewardsV2(rpcPoolData, position, tickLowerState, tickUpperState);
        const rewardInfos = rewards.map((r) => (r.gte(new bn_js_1.BN(0)) && r.lt(raydium_sdk_v2_1.U64_IGNORE_RANGE) ? r : new bn_js_1.BN(0)));
        const poolRewardInfos = rewardInfos
            .map((r, idx) => {
            var _a;
            const rewardMint = (_a = poolInfo.rewardDefaultInfos.find((r) => r.mint.address === rpcPoolData.rewardInfos[idx].tokenMint.toBase58())) === null || _a === void 0 ? void 0 : _a.mint;
            if (!rewardMint)
                return undefined;
            return {
                mint: rewardMint,
                amount: new decimal_js_1.Decimal(r.toString()).div(10 ** rewardMint.decimals).toNumber(),
            };
        })
            .filter(Boolean);
        const feeARewardIdx = poolRewardInfos.findIndex((r) => r.mint.address === poolInfo.mintA.address);
        if (feeARewardIdx >= 0)
            poolRewardInfos[feeARewardIdx].amount += feeAmountA;
        else
            poolRewardInfos.push({ mint: poolInfo.mintA, amount: feeAmountA });
        const feeBRewardIdx = poolRewardInfos.findIndex((r) => r.mint.address === poolInfo.mintB.address);
        if (feeBRewardIdx >= 0)
            poolRewardInfos[feeBRewardIdx].amount += feeAmountB;
        else
            poolRewardInfos.push({ mint: poolInfo.mintB, amount: feeAmountB });
        const symbolA = poolInfo.mintA.symbol === 'WSOL' ? 'SOL' : poolInfo.mintA.symbol;
        const symbolB = poolInfo.mintB.symbol === 'WSOL' ? 'SOL' : poolInfo.mintB.symbol;
        const prices = await this.getTokenPrices(`${symbolA},${symbolB}`);
        const priceA = prices[symbolA] || 0;
        const priceB = prices[symbolB] || 0;
        const feesValueA = feeAmountA * priceA;
        const feesValueB = feeAmountB * priceB;
        const totalFeesValue = feesValueA + feesValueB;
        const currentPositionValueA = Number(pooledAmountA) * priceA;
        const currentPositionValueB = Number(pooledAmountB) * priceB;
        const currentPositionValue = currentPositionValueA + currentPositionValueB;
        const positionRecord = await this.positionRepository.findOne({ where: { positionId: nftMint } });
        if (!positionRecord)
            throw new Error('Initial position data not found');
        const initialPositionValue = positionRecord.initialValue;
        const transactionCosts = positionRecord.transactionCosts || 0;
        const positionValueChange = currentPositionValue - initialPositionValue;
        const grossProfit = totalFeesValue + positionValueChange;
        const netProfit = grossProfit - transactionCosts;
        let profitability = 0;
        if (initialPositionValue > 0) {
            profitability = (netProfit / initialPositionValue) * 100;
        }
        const positionInfo = {
            positionId: positionNftMint.toBase58(),
            baseAmount: pooledAmountA,
            quoteAmount: pooledAmountB,
            priceRange: {
                lower: Number(priceLower.price),
                upper: Number(priceUpper.price),
            },
            currentPrice: rpcPoolData.currentPrice,
            profitability: profitability,
            actionHistory: [
                `Collected Fees: ${feeAmountA.toFixed(6)} ${poolInfo.mintA.symbol} (${feesValueA.toFixed(2)} USD)`,
                `Collected Fees: ${feeAmountB.toFixed(6)} ${poolInfo.mintB.symbol} (${feesValueB.toFixed(2)} USD)`,
            ],
            poolKeys: { id: position.poolId.toBase58() },
        };
        const poolInfoResponse = {
            poolId: position.poolId.toBase58(),
            baseMint: poolInfo.mintA.symbol,
            quoteMint: poolInfo.mintB.symbol,
            currentPrice: rpcPoolData.currentPrice,
        };
        return { position: positionInfo, pool: poolInfoResponse };
    }
    async currentOrderSettings() {
        try {
            const response = await axios_1.default.get(`http://${process.env.FUTURES_HOST}/order-settings`);
            return response.data;
        }
        catch (error) {
            console.error(`Failed to notify futures service: ${error.message}`);
        }
    }
    async setOrderSettings(orderSettings, initialAmount) {
        try {
            const response = await axios_1.default.post(`http://${process.env.FUTURES_HOST}/order-settings`, {
                orderSettings,
                initialAmount,
            });
            return response.data;
        }
        catch (error) {
            console.error(`Failed to notify futures service: ${error.message}`);
        }
    }
    async startBinance() {
        try {
            const response = await axios_1.default.post(`http://${process.env.FUTURES_HOST}/futures/start`);
            return response.data;
        }
        catch (error) {
            console.error(`Failed to notify futures service: ${error.message}`);
        }
    }
    async stopBinance() {
        try {
            const response = await axios_1.default.post(`http://${process.env.FUTURES_HOST}/futures/stop`);
            return response.data;
        }
        catch (error) {
            console.error(`Failed to notify futures service: ${error.message}`);
        }
    }
    async monitorPosition(positionId, priceRange) {
        throw new Error('Not implemented');
    }
    async setupLiquidityPosition_Test(params) {
        var _a, _b;
        console.log(`[TEST MODE] Received setup request for pool ${params.poolId}`);
        if (!params.hedgePlan || !params.hedgePlan.legs || params.hedgePlan.legs.length === 0) {
            throw new Error('[TEST MODE] Hedge plan is missing or invalid in the request.');
        }
        const hedgePlan = params.hedgePlan;
        const gridLeg = hedgePlan.legs[0];
        const positionId = `test-solana-pos-${Date.now()}`;
        const position = this.positionRepository.create({
            positionId,
            poolId: params.poolId,
            hedgeExchange: params.exchange,
            initialBaseAmount: params.inputAmount.toString(),
            initialQuoteAmount: "0",
            initialPriceA: (gridLeg.range.upper + gridLeg.range.lower) / 2,
            initialPriceB: 1,
            initialValue: hedgePlan.totalValue,
            startPrice: gridLeg.range.lower,
            endPrice: gridLeg.range.upper,
            hedgePlan: hedgePlan,
        });
        await this.positionRepository.save(position);
        console.log(`[TEST MODE] Saved fake position ${positionId} to DB.`);
        try {
            const payload = {
                positionId: positionId,
                hedgePlan: hedgePlan,
            };
            console.log(`[TEST MODE] Notifying futures service to START SIMULATION with data:`, payload);
            const exchangePrefix = params.exchange;
            const futuresHost = process.env.FUTURES_HOST;
            await axios_1.default.post(`http://${futuresHost}/${exchangePrefix}/hedging/start-simulation`, payload);
            console.log('[TEST MODE] Successfully notified futures service to start SIMULATION.');
        }
        catch (error) {
            console.error(`[TEST MODE] Failed to notify futures service: ${((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message}`);
            await this.positionRepository.delete({ positionId: positionId });
            throw new Error(`[TEST MODE] Binance Bot notification failed.`);
        }
        return { status: 'success (TEST MODE)', mint: positionId, txId: 'fake-tx-id-start' };
    }
    async closePosition_Test(nftMint) {
        console.log(`[TEST MODE] Attempting to close position: ${nftMint}`);
        const positionRecord = await this.positionRepository.findOne({ where: { positionId: nftMint } });
        if (!positionRecord) {
            throw new Error(`[TEST MODE] Position ${nftMint} not found in database`);
        }
        console.log(`[TEST MODE] Skipping on-chain transaction for closing position.`);
        try {
            const payload = { positionId: nftMint };
            const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(nftMint);
            console.log(`[TEST MODE] Notifying futures service (${exchangePrefix}) to stop hedging for position: ${nftMint}`);
            await axios_1.default.post(`http://${futuresHost}/${exchangePrefix}/hedging/stop`, payload);
            console.log('[TEST MODE] Successfully notified futures service to stop hedging.');
        }
        catch (error) {
            console.error(`[TEST MODE] Failed to notify futures service about closing position ${nftMint}: ${error.message}`);
        }
        await this.positionRepository.delete({ positionId: nftMint });
        console.log(`[TEST MODE] Fake position ${nftMint} removed from database.`);
        return { txId: 'fake-tx-id-close', success: true };
    }
    async getPositionDetails(positionId) {
        var _a;
        console.log(`Fetching details for position: ${positionId}`);
        const positionRecord = await this.positionRepository.findOne({ where: { positionId } });
        if (!positionRecord) {
            throw new Error(`Position ${positionId} not found in our database.`);
        }
        try {
            const hedgeDetails = await this.fetchHedgeDetails(positionId);
            return Object.assign(Object.assign({}, positionRecord), { hedgeDetails: hedgeDetails });
        }
        catch (error) {
            console.error(`Failed to fetch hedge details for ${positionId} from futures-service:`, error instanceof Error ? error.message : error);
            if (axios_1.default.isAxiosError(error) && ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                return Object.assign(Object.assign({}, positionRecord), { hedgeDetails: null, error: "Hedge position info not found on the futures service. It might have been cleared or not created." });
            }
            throw new Error("Could not fetch details from the futures service.");
        }
    }
    async getAllActiveForHedging() {
        console.log('Fetching data for ALL active positions...');
        const allPositions = await this.positionRepository.find();
        return allPositions.map(pos => {
            if (pos.hedgePlan && typeof pos.hedgePlan === 'object' && Object.keys(pos.hedgePlan).length > 0) {
                console.log(`Position ${pos.positionId} has a saved plan. Exporting it.`);
                return {
                    positionId: pos.positionId,
                    hedgePlan: pos.hedgePlan,
                };
            }
            else {
                console.warn(`Position ${pos.positionId} does NOT have a saved plan. Exporting data for fallback recalculation.`);
                const DUMMY_PERCENT = 0.10;
                const startPrice = pos.startPrice || pos.initialPriceA * (1 - DUMMY_PERCENT);
                const endPrice = pos.endPrice || pos.initialPriceA * (1 + DUMMY_PERCENT);
                return {
                    positionId: pos.positionId,
                    pairName: 'SOL/USDT',
                    totalValue: pos.initialValue.toString(),
                    range: {
                        lower: startPrice.toString(),
                        upper: endPrice.toString(),
                    },
                };
            }
        });
    }
    async getActiveWallet() {
        try {
            const owner = await this.getOwnerKeypair();
            return { publicKey: owner.publicKey.toBase58() };
        }
        catch (error) {
            if (error instanceof Error && error.message.startsWith('Private key is not set')) {
                return { publicKey: null };
            }
            throw error;
        }
    }
    async getHedgePreview(params) {
        var _a, _b, _c;
        const symbolsToFetch = params.legs.map(leg => leg.baseMint).join(',');
        const prices = await this.getTokenPrices(symbolsToFetch);
        let totalValue = 0;
        const calculationLegs = [];
        for (const leg of params.legs) {
            const currentPrice = prices[leg.baseMint];
            if (!currentPrice) {
                throw new Error(`Could not fetch price for base asset ${leg.baseMint}`);
            }
            const valueForLeg = leg.inputAmount * currentPrice;
            totalValue += valueForLeg;
            const percent = leg.priceRangePercent / 100;
            const lowerPrice = currentPrice * (1 - percent);
            const upperPrice = currentPrice * (1 + percent);
            calculationLegs.push({
                binanceSymbol: leg.binancePairSymbol,
                range: {
                    lower: lowerPrice.toString(),
                    upper: upperPrice.toString(),
                },
                customBaseHedgeAmount: leg.inputAmount,
                customLeverage: 0,
            });
        }
        try {
            const binanceServiceHost = process.env.FUTURES_HOST;
            const payload = {
                strategyType: params.strategyType,
                totalValue: totalValue.toString(),
                pairName: params.pairName,
                legs: calculationLegs,
            };
            console.log(`[DIAGNOSTIC] Sending to calculate-plan with totalValue: ${payload.totalValue}`);
            const response = await axios_1.default.post(`http://${binanceServiceHost}/binance/hedging/calculate-plan`, payload);
            return response.data;
        }
        catch (error) {
            console.error('Failed to get hedge preview from binance-service', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error(((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || 'Could not calculate hedge plan.');
        }
    }
    async recalculateHedgePlan(positionId, plan) {
        var _a, _b, _c;
        try {
            const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(positionId);
            const response = await axios_1.default.post(`http://${futuresHost}/${exchangePrefix}/hedging/recalculate-plan`, plan);
            return response.data;
        }
        catch (error) {
            console.error('Failed to get recalculated hedge plan from futures-service', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error(((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || 'Could not recalculate hedge plan.');
        }
    }
    async getValidPairs() {
        console.log('Fetching valid pairs from the local raydium-pools.json file.');
        const filePath = path.join(__dirname, '..', '..', 'raydium-pools.json');
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const configuredPools = JSON.parse(fileContent);
            console.log(`Successfully loaded ${configuredPools.length} pairs from the config file.`);
            return configuredPools;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                console.error('CRITICAL ERROR: raydium-pools.json not found.');
            }
            else {
                console.error(`A critical error occurred while reading the pools file: ${error.message}`);
            }
            return [];
        }
    }
    async getFuturesAccountBalance(exchange) {
        try {
            const futuresHost = process.env.FUTURES_HOST;
            const response = await axios_1.default.get(`http://${futuresHost}/${exchange}/account/balance`);
            return response.data;
        }
        catch (error) {
            console.error(`Failed to get balance from ${exchange}-service: ${error.message}`);
            throw new Error(`Could not retrieve ${exchange} balance.`);
        }
    }
    async enableRebalance(positionId) {
        const position = await this.positionRepository.findOne({ where: { positionId } });
        if (!position) {
            throw new Error(`Position ${positionId} not found`);
        }
        position.isAutoRebalancing = true;
        await this.positionRepository.save(position);
        console.log(`Position ${positionId} successfully marked for rebalancing in DB.`);
        try {
            const rebalancerHost = process.env.REBALANCER_HOST;
            await axios_1.default.post(`http://${rebalancerHost}/rebalance/start`, {
                positionId: positionId,
            });
            console.log(`Successfully sent start command to rebalancer for position ${positionId}.`);
        }
        catch (error) {
            console.error(`Failed to send start command to rebalancer for ${positionId}:`, error.message);
            position.isAutoRebalancing = false;
            await this.positionRepository.save(position);
            throw new Error('Could not communicate with the rebalancer service.');
        }
    }
    async disableRebalance(positionId) {
        const position = await this.positionRepository.findOne({ where: { positionId } });
        if (!position) {
            throw new Error(`Position ${positionId} not found`);
        }
        position.isAutoRebalancing = false;
        await this.positionRepository.save(position);
        console.log(`Position ${positionId} successfully unmarked for rebalancing in DB. Worker will stop automatically.`);
    }
    async handleRebalanceCompletion(data) {
        const { oldPositionId, newPositionData, fees } = data;
        console.log(`Handling rebalance completion: OLD ${oldPositionId} -> NEW ${newPositionData.positionId}`);
        const oldPosition = await this.positionRepository.findOne({ where: { positionId: oldPositionId } });
        if (!oldPosition) {
            console.warn(`[Rebalance] Callback for a non-existent old position ${oldPositionId}. Cannot proceed.`);
            return;
        }
        try {
            const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(oldPositionId);
            await axios_1.default.post(`http://${futuresHost}/${exchangePrefix}/hedging/remap`, {
                oldPositionId: oldPositionId,
                newPositionId: newPositionData.positionId,
            });
            console.log(`[Rebalance] Successfully notified ${exchangePrefix}-service to remap hedge key.`);
        }
        catch (error) {
            console.error(`[CRITICAL] Failed to remap hedge in futures-service for ${oldPositionId}. The hedge might be orphaned.`, error.message);
        }
        await this.positionRepository.delete({ positionId: oldPositionId });
        console.log(`[Rebalance] Old position record ${oldPositionId} has been deleted.`);
        const totalRebalanceCost = (fees.closeOldPositionFeeUSD || 0) + (fees.openNewPositionFeeUSD || 0);
        const positionToSave = Object.assign(Object.assign({}, newPositionData), { hedgePlan: oldPosition.hedgePlan, transactionCosts: totalRebalanceCost, isAutoRebalancing: true });
        const savedPosition = await this.positionRepository.save(positionToSave);
        console.log(`[Rebalance] New position record ${savedPosition.positionId} created with total rebalance cost of ${totalRebalanceCost.toFixed(4)} USD.`);
        try {
            const rebalancerHost = process.env.REBALANCER_HOST;
            if (rebalancerHost) {
                console.log(`[Rebalance] Sending START command to rebalancer for new position: ${savedPosition.positionId}`);
                await axios_1.default.post(`http://${rebalancerHost}/rebalance/start`, {
                    positionId: savedPosition.positionId,
                });
                console.log(`[Rebalance] Successfully sent start command to rebalancer.`);
            }
            else {
                console.warn('[Rebalance] REBALANCER_HOST is not configured. Cannot send start command.');
            }
        }
        catch (error) {
            console.error(`[CRITICAL] Failed to send START command to rebalancer for new position ${savedPosition.positionId}.`, error.message);
        }
    }
    async getChartData(poolId, resolution, from, to) {
        var _a, _b, _c, _d, _e, _f, _g;
        console.log(`Requesting chart data for pool ${poolId} from GeckoTerminal`);
        const timeframeMap = {
            '15M': { unit: 'minute', aggregate: 15 },
            '1H': { unit: 'hour', aggregate: 1 },
            '4H': { unit: 'hour', aggregate: 4 },
            '1D': { unit: 'day', aggregate: 1 },
        };
        const apiParams = timeframeMap[resolution] || timeframeMap['1H'];
        const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolId}/ohlcv/${apiParams.unit}`;
        try {
            const response = await axios_1.default.get(url, {
                timeout: 15000,
                params: {
                    aggregate: apiParams.aggregate,
                    limit: 1000,
                    start_timestamp: from,
                    end_timestamp: to,
                },
                headers: {
                    'Accept': 'application/json;version=20240301'
                }
            });
            console.log(`Received response from GeckoTerminal for pool ${poolId}`);
            const ohlcvList = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.attributes) === null || _c === void 0 ? void 0 : _c.ohlcv_list;
            if (!ohlcvList || ohlcvList.length === 0) {
                console.warn(`No chart data returned from GeckoTerminal for pool ${poolId}`);
                return [];
            }
            console.log(`Processing ${ohlcvList.length} candles...`);
            return ohlcvList.map((candle) => ({
                time: candle[0],
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4],
                volume: candle[5],
            }));
        }
        catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.error(`Request to GeckoTerminal timed out for pool ${poolId}`);
            }
            else {
                const errorDetails = ((_g = (_f = (_e = (_d = error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.errors) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.title) || error.message;
                console.error(`Failed to fetch chart data from GeckoTerminal for pool ${poolId}: ${errorDetails}`);
            }
            throw new Error('Chart data provider did not respond in time.');
        }
    }
    async updateHedgeState(positionId, state) {
        const position = await this.positionRepository.findOne({ where: { positionId } });
        if (!position) {
            throw new Error('Position not found');
        }
        position.hedgePlan = state;
        return this.positionRepository.save(position);
    }
    async fetchAllPositionsWithDetails() {
        console.log('Fetching all user positions with full details (BATCHED)...');
        const owner = await this.getOwnerKeypair();
        await this.initialize(owner);
        const positionRecords = await this.positionRepository.find();
        if (!positionRecords || positionRecords.length === 0) {
            return [];
        }
        const realPositionRecords = positionRecords.filter(p => !p.positionId.startsWith('test-'));
        const positionKeys = realPositionRecords.map(record => (0, raydium_sdk_v2_1.getPdaPersonalPositionAddress)(raydium_sdk_v2_1.CLMM_PROGRAM_ID, new web3_js_1.PublicKey(record.positionId)).publicKey);
        console.log(`Fetching ${positionKeys.length} position accounts in a single batch request...`);
        const positionAccounts = await this.raydium.connection.getMultipleAccountsInfo(positionKeys);
        const positionAccountMap = new Map();
        positionAccounts.forEach((account, index) => {
            if (account) {
                positionAccountMap.set(realPositionRecords[index].positionId, raydium_sdk_v2_1.PositionInfoLayout.decode(account.data));
            }
        });
        const positionsWithDetails = await Promise.all(positionRecords.map(async (record) => {
            try {
                if (record.positionId.startsWith('test-')) {
                    const testDetails = await this.fetchHedgeDetails(record.positionId);
                    return Object.assign(Object.assign({}, record), { profitability: 0, details: testDetails });
                }
                const positionData = positionAccountMap.get(record.positionId);
                if (!positionData) {
                    console.warn(`[GHOST DETECTED] Position ${record.positionId} is in DB but not on-chain. Hiding from frontend.`);
                    return null;
                }
                const poolInfo = (await this.raydium.api.fetchPoolById({ ids: positionData.poolId.toBase58() }))[0];
                const { amountA, amountB } = raydium_sdk_v2_1.PositionUtils.getAmountsFromLiquidity({
                    poolInfo,
                    ownerPosition: positionData,
                    liquidity: positionData.liquidity,
                    slippage: 0, add: false,
                    epochInfo: await this.connection.getEpochInfo(),
                });
                const symbolA = poolInfo.mintA.symbol === 'WSOL' ? 'SOL' : poolInfo.mintA.symbol;
                const symbolB = poolInfo.mintB.symbol === 'WSOL' ? 'SOL' : poolInfo.mintB.symbol;
                const prices = await this.getTokenPrices(`${symbolA},${symbolB}`);
                const priceA = new decimal_js_1.Decimal(prices[symbolA] || 0);
                const priceB = new decimal_js_1.Decimal(prices[symbolB] || 0);
                const pooledAmountA = new decimal_js_1.Decimal(amountA.amount.toString()).div(10 ** poolInfo.mintA.decimals);
                const pooledAmountB = new decimal_js_1.Decimal(amountB.amount.toString()).div(10 ** poolInfo.mintB.decimals);
                const currentPositionValue = pooledAmountA.mul(priceA).add(pooledAmountB.mul(priceB));
                const initialPositionValue = new decimal_js_1.Decimal(record.initialValue);
                const transactionCosts = new decimal_js_1.Decimal(record.transactionCosts || 0);
                let profitability = new decimal_js_1.Decimal(0);
                if (initialPositionValue.gt(0)) {
                    const valueChange = currentPositionValue.sub(initialPositionValue);
                    const netProfit = valueChange.sub(transactionCosts);
                    profitability = netProfit.div(initialPositionValue).mul(100);
                }
                const combinedData = Object.assign(Object.assign({}, record), { baseAmount: pooledAmountA.toString(), quoteAmount: pooledAmountB.toString(), priceRange: {
                        lower: raydium_sdk_v2_1.TickUtils.getTickPrice({ poolInfo, tick: positionData.tickLower, baseIn: true }).price.toNumber(),
                        upper: raydium_sdk_v2_1.TickUtils.getTickPrice({ poolInfo, tick: positionData.tickUpper, baseIn: true }).price.toNumber(),
                    }, currentPrice: poolInfo.price, profitability: profitability.toNumber(), details: await this.fetchHedgeDetails(record.positionId) });
                return combinedData;
            }
            catch (error) {
                console.error(`Could not process position ${record.positionId} in batch: ${error.message}`);
                return Object.assign(Object.assign({}, record), { details: { error: `Failed to process position.` } });
            }
        }));
        const validPositions = positionsWithDetails.filter(p => p !== null);
        console.log(`Successfully processed and filtered ${validPositions.length} positions.`);
        return validPositions;
    }
    async fetchHedgeDetails(positionId) {
        try {
            const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(positionId);
            const requestUrl = `http://${futuresHost}/${exchangePrefix}/hedging/status/${positionId}`;
            console.log(`Fetching hedge details from: ${requestUrl}`);
            const response = await axios_1.default.get(requestUrl);
            return response.data;
        }
        catch (error) {
            console.error(`[fetchHedgeDetails] Failed for position ${positionId}: ${error.message}`);
            if (axios_1.default.isAxiosError(error)) {
                throw error;
            }
            return { error: "Hedge details not found or service is unavailable." };
        }
    }
    async getAutomatedRange(poolId, initialLpValueUsd) {
        var _a, _b, _c;
        console.log(`Proxying automated range request to analytics service for pool ${poolId}`);
        const targetUrl = `${this.analyticsServiceHost}/api/v3/hedge-breakeven-range`;
        try {
            const response = await axios_1.default.get(targetUrl, {
                params: {
                    pool_id: poolId,
                    initial_lp_value_usd: initialLpValueUsd,
                    hedge_ratio: 0.2,
                    time_to_edge_days: 7,
                },
                timeout: 15000,
            });
            console.log(`Successfully received automated range from analytics service for pool ${poolId}`);
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const errorMsg = ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.detail) || error.message;
                const statusCode = ((_c = error.response) === null || _c === void 0 ? void 0 : _c.status) || 500;
                console.error(`Error from analytics service: [${statusCode}] ${errorMsg}`);
                throw new Error(errorMsg);
            }
            console.error('An unknown error occurred while calling the analytics service', error);
            throw new Error('Failed to communicate with the range analytics service.');
        }
    }
    async getHighAprPools() {
        console.log(`Proxying request to scanner service at ${this.scannerHost}`);
        try {
            const response = await axios_1.default.get(`${this.scannerHost}/api/high-apr-pools`, {
                timeout: 5000,
            });
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                console.error(`Failed to connect to scanner service: ${error.message}`);
                return [];
            }
            console.error('An unknown error occurred while proxying to scanner.', error);
            throw new Error('Could not retrieve data from the scanner service.');
        }
    }
    async startHedgeSimulationForExisting(params) {
        console.log(`[SIMULATION] Starting hedge simulation for existing position: ${params.positionId}`);
        try {
            const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(params.positionId);
            let endpoint;
            if (params.legs && Array.isArray(params.legs) && params.legs.length > 0) {
                console.log(`[SIMULATION] Detected DUAL-LEG (volatile/volatile) simulation request.`);
                endpoint = 'hedging/start-delta-neutral-simulation';
            }
            else {
                console.log(`[SIMULATION] Detected SINGLE-LEG (volatile/stable) simulation request.`);
                endpoint = 'hedging/start-delta-neutral-simulation';
            }
            const targetUrl = `http://${futuresHost}/${exchangePrefix}/${endpoint}`;
            const response = await axios_1.default.post(targetUrl, params);
            return response.data;
        }
        catch (error) {
            console.error(`Failed to start simulation for existing position: ${error.message}`);
            throw new Error('Could not start simulation on the hedging service.');
        }
    }
    async getFuturesServiceConfig(positionId) {
        const position = await this.positionRepository.findOne({ where: { positionId } });
        const exchange = (position === null || position === void 0 ? void 0 : position.hedgeExchange) || 'binance';
        const hostEnvVariable = exchange === 'bybit' ? 'BYBIT_FUTURES_HOST' : 'BINANCE_FUTURES_HOST';
        const futuresHost = process.env[hostEnvVariable];
        if (!futuresHost) {
            throw new Error(`Host for ${exchange} (${hostEnvVariable}) is not configured in .env`);
        }
        return {
            futuresHost,
            exchangePrefix: exchange,
        };
    }
    async validateDeltaNeutralValue(params) {
        var _a;
        console.log(`[Validation] Received request for ${params.exchange} with value ${params.totalValue}`);
        try {
            const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfigForExchange(params.exchange);
            await axios_1.default.post(`http://${futuresHost}/${exchangePrefix}/hedging/validate-value`, {
                totalValue: params.totalValue,
                legs: params.legs,
            });
            return { isValid: true, message: 'OK' };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data)) {
                return { isValid: false, message: error.response.data.message };
            }
            return { isValid: false, message: 'Could not connect to the hedging service for validation.' };
        }
    }
    async getFuturesServiceConfigForExchange(exchange) {
        const hostEnvVariable = exchange === 'bybit' ? 'BYBIT_FUTURES_HOST' : 'BINANCE_FUTURES_HOST';
        const futuresHost = process.env[hostEnvVariable];
        if (!futuresHost) {
            throw new Error(`Host for ${exchange} (${hostEnvVariable}) is not configured in .env`);
        }
        return {
            futuresHost,
            exchangePrefix: exchange,
        };
    }
}
exports.LiquidityBotService = LiquidityBotService;
