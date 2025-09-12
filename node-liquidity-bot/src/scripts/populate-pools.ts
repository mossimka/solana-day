import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Api } from '@raydium-io/raydium-sdk-v2';
import { Cluster } from '@raydium-io/raydium-sdk-v2/lib/solana';

const BINANCE_SYMBOLS_URL = 'http://127.0.0.1:3004/binance/tradable-symbols';
const OUTPUT_FILE_PATH = path.join(__dirname, '..', '..', 'raydium-pools.json');
const STABLECOINS = new Set(['USDC', 'USDT', 'USDH', 'UXD', 'PAI']);
const QUOTE_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; 

interface FinalPoolFormat {
    poolId: string;
    baseMint: string;
    quoteMint: string;
    binancePairSymbol?: string;
    baseCexSymbol?: string;
    quoteCexSymbol?: string;
}

function findMatchingBinanceSymbol(raydiumSymbol: string, binanceSymbols: Set<string>): string | null {
    if (STABLECOINS.has(raydiumSymbol)) return null;
    const directMatch = `${raydiumSymbol}USDT`;
    if (binanceSymbols.has(directMatch)) {
        return directMatch;
    }
    const regex = new RegExp(`^\\d+${raydiumSymbol}USDT$`);
    for (const binanceSymbol of binanceSymbols) {
        if (regex.test(binanceSymbol)) {
            return binanceSymbol;
        }
    }
    return null;
}

async function generatePoolsFile() {
    console.log('🚀 Starting script to build the definitive pool list (v/s and v/v)...');

    const raydiumApi = new Api({
        cluster: 'mainnet' as Cluster,
        timeout: 60000,
    });

    try {
        console.log('Fetching all tradable symbols from Binance...');
        const binanceResponse = await axios.get<string[]>(BINANCE_SYMBOLS_URL);
        const binanceSymbols = new Set(binanceResponse.data);
        console.log(`✅ Found ${binanceSymbols.size} total symbols on Binance.`);

        console.log('Fetching full token list from Raydium via SDK...');
        const tokenListResponse = await raydiumApi.getTokenList();
        const allRaydiumTokens = tokenListResponse.mintList;
        console.log(`✅ Found ${allRaydiumTokens.length} total tokens on Raydium.`);

        console.log('Filtering for volatile tokens with a CEX counterpart...');
        const volatileTradableTokens = allRaydiumTokens
            .filter(token => !STABLECOINS.has(token.symbol))
            .map(token => ({
                ...token,
                cexSymbol: findMatchingBinanceSymbol(token.symbol, binanceSymbols),
            }))
            .filter(token => token.cexSymbol !== null);
        console.log(`✅ Found ${volatileTradableTokens.length} tradable volatile tokens. Starting pool search.`);

        const finalPoolList: FinalPoolFormat[] = [];
        const promises: Promise<void>[] = [];

        console.log('Searching for Volatile/Stable pools...');
        for (const token of volatileTradableTokens) {
            promises.push(
                raydiumApi.fetchPoolByMints({ mint1: token.address, mint2: QUOTE_MINT })
                    .then(poolsData => {
                        if (poolsData?.data?.length > 0) {
                            finalPoolList.push({
                                poolId: poolsData.data[0].id,
                                baseMint: token.symbol,
                                quoteMint: 'USDC',
                                binancePairSymbol: token.cexSymbol!,
                            });
                        }
                    }).catch(() => {  })
            );
        }
        await Promise.all(promises);
        console.log(`✅ V/S search complete. Found ${finalPoolList.length} pools so far.`);

        console.log('Searching for Volatile/Volatile pools...');
        const v_v_promises: Promise<void>[] = [];
        for (let i = 0; i < volatileTradableTokens.length; i++) {
            for (let j = i + 1; j < volatileTradableTokens.length; j++) {
                const tokenA = volatileTradableTokens[i];
                const tokenB = volatileTradableTokens[j];

                v_v_promises.push(
                    raydiumApi.fetchPoolByMints({ mint1: tokenA.address, mint2: tokenB.address })
                        .then(poolsData => {
                            if (poolsData?.data?.length > 0) {
                                console.log(`✔️  Found V/V Pool: ${tokenA.symbol}/${tokenB.symbol}`);
                                finalPoolList.push({
                                    poolId: poolsData.data[0].id,
                                    baseMint: tokenA.symbol,
                                    quoteMint: tokenB.symbol,
                                    baseCexSymbol: tokenA.cexSymbol!,
                                    quoteCexSymbol: tokenB.cexSymbol!,
                                });
                            }
                        }).catch(() => {})
                );
            }
        }

        const CONCURRENCY_LIMIT = 15;
        console.log(`Processing ${v_v_promises.length} potential V/V pairs in batches...`);
        for (let i = 0; i < v_v_promises.length; i += CONCURRENCY_LIMIT) {
            const batch = v_v_promises.slice(i, i + CONCURRENCY_LIMIT);
            await Promise.all(batch);
            process.stdout.write(`...Processed ${Math.min(i + CONCURRENCY_LIMIT, v_v_promises.length)} / ${v_v_promises.length} pairs\r`);
        }
        console.log('\n✅ V/V pool search complete.');

        finalPoolList.sort((a, b) => a.baseMint.localeCompare(b.baseMint));
        console.log(`Writing ${finalPoolList.length} total found pools to ${OUTPUT_FILE_PATH}...`);
        await fs.writeFile(OUTPUT_FILE_PATH, JSON.stringify(finalPoolList, null, 2));
        console.log('🎉 Successfully created raydium-pools.json!');

    } catch (error) {
        console.error('❌ An error occurred during script execution:');
        if (axios.isAxiosError(error)) {
            console.error('Request URL:', error.config?.url);
            console.error('Error details:', error.response?.data || error.message);
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

generatePoolsFile();