import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
    Raydium,
    ApiV3PoolInfoConcentratedItem,
    PoolUtils,
    TickUtils,
    PositionInfoLayout,
    getPdaPersonalPositionAddress,
    CLMM_PROGRAM_ID,
    PositionUtils,
    TxVersion
} from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import { Decimal } from 'decimal.js';
import axios from 'axios';
import logger from '../logger';

const txVersion: TxVersion = 0; // Используем 0 для поддержки getTransaction

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


export async function getClmmPoolInfo(raydium: Raydium, poolId: string): Promise<ApiV3PoolInfoConcentratedItem | null> {
    try {
        const data = await raydium.api.fetchPoolById({ ids: poolId });
        if (!data || data.length === 0) {
            logger.error(`Could not fetch rich pool info for pool ${poolId}`);
            return null;
        }
        return data[0] as ApiV3PoolInfoConcentratedItem;
    } catch (error) {
        logger.error(`Error in getClmmPoolInfo for ${poolId}:`, error);
        return null;
    }
}

export async function getOwnerPositions(raydium: Raydium): Promise<any[]> {
    try {
        const allPositions = await raydium.clmm.getOwnerPositionInfo({ programId: CLMM_PROGRAM_ID });
        logger.info(`Found ${allPositions.length} total positions.`);
        return allPositions;
    } catch (error) {
        logger.error('Error fetching owner CLMM positions:', error);
        throw error;
    }
}

export function calculatePriceBoundaries(poolInfo: ApiV3PoolInfoConcentratedItem, currentPrice: number, rangePercentage: number) {
    const price = new Decimal(currentPrice);
    const range = new Decimal(rangePercentage);
    const lowerPrice = price.mul(new Decimal(1).sub(range));
    const upperPrice = price.mul(new Decimal(1).add(range));
    const { tick: lowerTick } = TickUtils.getPriceAndTick({ poolInfo, price: lowerPrice, baseIn: true });
    const { tick: upperTick } = TickUtils.getPriceAndTick({ poolInfo, price: upperPrice, baseIn: true });
    return { lowerPrice, upperPrice, lowerTick: Math.min(lowerTick, upperTick), upperTick: Math.max(lowerTick, upperTick) };
}

export async function openPosition(raydium: Raydium, poolInfo: ApiV3PoolInfoConcentratedItem, tickLower: number, tickUpper: number, baseAmount: BN) {
    try {
        const epochInfo = await raydium.fetchEpochInfo();
        const slippage = parseFloat(process.env.DEFAULT_SLIPPAGE_BPS || '50') / 10000;
        const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
            poolInfo, slippage, inputA: true, tickUpper, tickLower, amount: baseAmount, add: true, amountHasFee: true, epochInfo,
        });

        const { execute, extInfo } = await raydium.clmm.openPositionFromBase({
            poolInfo, 
            tickUpper, 
            tickLower, 
            base: 'MintA', 
            ownerInfo: { useSOLBalance: true },
            baseAmount, 
            otherAmountMax: res.amountSlippageB.amount,
            txVersion,
            computeBudgetConfig: { units: 800000, microLamports: 200000 },
            nft2022: true
        });

        const { txId } = await execute({ sendAndConfirm: true });
        logger.info(`Opened new position. NFT Mint: ${extInfo.nftMint.toBase58()}, Tx: ${txId}`);
        
        const feeUSD = await getFeeInUsd(raydium.connection, txId);

        return { nftMint: extInfo.nftMint, txId, feeUSD };
    } catch (error) {
        logger.error('Error opening CLMM position:', error);
        return null;
    }
}

export async function closePosition(raydium: Raydium, positionToClose: any): Promise<{ closeTxId: string; feeUSD: number } | null> {
    const nftMint = positionToClose.nftMint.toBase58();
    let totalFeeUSD = 0;
    let finalTxId = 'N/A';

    try {
        const poolInfo = await getClmmPoolInfo(raydium, positionToClose.poolId.toBase58());
        if (!poolInfo) throw new Error(`Could not fetch rich pool info for ${nftMint}`);
        
        const { poolKeys } = await raydium.clmm.getPoolInfoFromRpc(positionToClose.poolId.toBase58());

        if (!positionToClose.liquidity.isZero()) {
            const { execute: executeDecrease } = await raydium.clmm.decreaseLiquidity({
                poolInfo, poolKeys, ownerPosition: positionToClose,
                ownerInfo: { useSOLBalance: true, closePosition: false },
                liquidity: positionToClose.liquidity, amountMinA: new BN(0), amountMinB: new BN(0),
                txVersion,
            });
            const { txId: decreaseTxId } = await executeDecrease({ sendAndConfirm: true });
            totalFeeUSD += await getFeeInUsd(raydium.connection, decreaseTxId);
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const finalPositions = await getOwnerPositions(raydium);
        const finalPositionState = finalPositions.find((p) => p.nftMint.equals(positionToClose.nftMint));
        if (!finalPositionState) {
             logger.warn(`Position ${nftMint} already closed after decreasing liquidity.`);
             return { closeTxId: 'N/A - already closed', feeUSD: totalFeeUSD };
        }
        
        const { execute: executeClose } = await raydium.clmm.closePosition({
            poolInfo, poolKeys, ownerPosition: finalPositionState, 
            txVersion,
        });
        const { txId: closeTxId } = await executeClose({ sendAndConfirm: true });
        finalTxId = closeTxId;
        totalFeeUSD += await getFeeInUsd(raydium.connection, closeTxId);

        return { closeTxId: finalTxId, feeUSD: totalFeeUSD };
    } catch (error) {
        logger.error(`Error closing position ${nftMint}:`, error);
        return null;
    }
}

export async function fetchPositionInfo(raydium: Raydium, nftMint: string) {
    const positionNftMint = new PublicKey(nftMint);
    const positionPubKey = getPdaPersonalPositionAddress(CLMM_PROGRAM_ID, positionNftMint).publicKey;
    const posAccount = await raydium.connection.getAccountInfo(positionPubKey);
    if (!posAccount) throw new Error('Position account not found');
    const position = PositionInfoLayout.decode(posAccount.data);

    const poolInfo = await getClmmPoolInfo(raydium, position.poolId.toBase58());
    if (!poolInfo) throw new Error(`Could not fetch pool info for ${nftMint}`);
    
    const epochInfo = await raydium.connection.getEpochInfo();
    const { amountA, amountB } = PositionUtils.getAmountsFromLiquidity({
        poolInfo, ownerPosition: position, liquidity: position.liquidity, slippage: 0, add: false, epochInfo,
    });
    
    return {
        baseAmount: new Decimal(amountA.amount.toString()).div(10 ** poolInfo.mintA.decimals).toString(),
        quoteAmount: new Decimal(amountB.amount.toString()).div(10 ** poolInfo.mintB.decimals).toString(),
    };
}

export function addPricesToPosition(position: any, poolInfo: ApiV3PoolInfoConcentratedItem) {
    try {
        const decimalDifference = poolInfo.mintA.decimals - poolInfo.mintB.decimals;
        const ten = new Decimal(10);
        const priceFactor = ten.pow(decimalDifference);

        const priceLower = new Decimal(1.0001)
            .pow(position.tickLower)
            .mul(priceFactor);

        const priceUpper = new Decimal(1.0001)
            .pow(position.tickUpper)
            .mul(priceFactor);
    
        return {
            ...position,
            priceLower: priceLower.toNumber(),
            priceUpper: priceUpper.toNumber()
        };
    } catch (error) {
        logger.error('Failed to calculate prices from ticks', error);
        return {
            ...position,
            priceLower: undefined,
            priceUpper: undefined
        }
    }
}
