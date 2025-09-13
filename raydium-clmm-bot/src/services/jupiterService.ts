import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { QuoteResponse, SwapMode, createJupiterApiClient } from '@jup-ag/api';
import logger from '../logger';
import BN from 'bn.js';
import 'dotenv/config';
import axios from 'axios';

const jupiterApi = createJupiterApiClient();

// --- Утилитарная функция для получения цен (дубликат для автономности) ---
async function getTokenPrices(symbols: string[]): Promise<{ [symbol: string]: number }> {
    const prices: { [symbol: string]: number } = {};
    try {
        const response = await axios.get(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest`, {
            params: { symbol: symbols.join(',') },
            headers: { 'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY },
        });
        symbols.forEach(symbol => {
            const priceData = response.data?.data?.[symbol]?.[0]?.quote?.USD?.price;
            prices[symbol] = priceData ? parseFloat(priceData) : 0;
        });
    } catch (error) {
        logger.error(`Failed to fetch prices for ${symbols.join(',')}:`, error);
        symbols.forEach(symbol => { prices[symbol] = 0; });
    }
    return prices;
}

// --- Утилитарная функция для расчета комиссии ---
async function getFeeInUsd(connection: Connection, txId: string): Promise<number> {
    try {
        const txDetails = await connection.getTransaction(txId, { maxSupportedTransactionVersion: 0 });
        if (!txDetails || !txDetails.meta) return 0;
        
        const feeInLamports = txDetails.meta.fee;
        const feeInSol = feeInLamports / 1_000_000_000;
        
        const solPriceData = await getTokenPrices(['SOL']);
        const solPrice = solPriceData['SOL'] || 0;
        
        const feeUSD = feeInSol * solPrice;
        logger.info(`Fee for tx ${txId}: ${feeInSol.toFixed(9)} SOL ($${feeUSD.toFixed(5)})`);
        return feeUSD;
    } catch (error) {
        logger.error(`Could not fetch fee for tx ${txId}:`, error);
        return 0;
    }
}

export async function getSwapQuote(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    swapMode: SwapMode = SwapMode.ExactIn
): Promise<QuoteResponse | null> {
    try {
        const slippageBps = parseInt(process.env.DEFAULT_SLIPPAGE_BPS || '50');

        logger.info(`Getting Jupiter quote: ${amount.toString()} of ${inputMint.toBase58()} to ${outputMint.toBase58()}`);
        const quote = await jupiterApi.quoteGet({
            inputMint: inputMint.toBase58(),
            outputMint: outputMint.toBase58(),
            amount: amount.toNumber(),
            slippageBps: slippageBps,
            swapMode,
        });

        if (!quote) {
            logger.warn('No Jupiter quote found for the given parameters.');
            return null;
        }
        logger.info(`Jupiter quote received: ${quote.outAmount} of ${outputMint.toBase58()} for ${quote.inAmount} of ${inputMint.toBase58()}`);
        return quote;
    } catch (error) {
        logger.error('Error getting Jupiter swap quote:', error);
        throw error;
    }
}

export async function executeSwap(
    connection: Connection,
    wallet: Keypair,
    quoteResponse: QuoteResponse
): Promise<{ txId: string; feeUSD: number } | null> {
    try {
        logger.info(`Executing Jupiter swap for quote: ${quoteResponse.inAmount} -> ${quoteResponse.outAmount}`);
        const { swapTransaction } = await jupiterApi.swapPost({
            swapRequest: {
                quoteResponse,
                userPublicKey: wallet.publicKey.toBase58(),
                wrapAndUnwrapSol: true,
            }
        });

        const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        transaction.sign([wallet]);

        const rawTransaction = transaction.serialize();
        const txId = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
            maxRetries: 5,
        });

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            signature: txId,
            blockhash,
            lastValidBlockHeight
        }, 'confirmed');
        
        logger.info(`Swap successful! Transaction signature: ${txId}`);
        const feeUSD = await getFeeInUsd(connection, txId);

        return { txId, feeUSD };

    } catch (error: any) {
        logger.error('Error executing Jupiter swap:');
        if (error.response?.data) {
            logger.error(JSON.stringify(error.response.data, null, 2));
        } else {
            logger.error(error);
        }
        return null;
    }
}
