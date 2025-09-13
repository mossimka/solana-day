import express, { Router } from 'express';
import 'dotenv/config';
import axios from 'axios';
import { DataSource } from 'typeorm';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Raydium, ApiV3PoolInfoConcentratedItem, TickUtils } from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import bs58 from 'bs58';
import { Decimal } from 'decimal.js';
import { AppDataSource } from './data-source';
import { Position } from './entities/position.entity';
import { SessionWallet } from './entities/session-wallet.entity';
import { CryptoService } from './services/crypto.service';
import { initSdk } from './utils/sdkUtil';
import logger from './logger';
import { getClmmPoolInfo, getOwnerPositions, calculatePriceBoundaries, openPosition, closePosition, fetchPositionInfo, addPricesToPosition } from './services/raydiumService';
import { getSwapQuote, executeSwap } from './services/jupiterService';
import { getTokenBalance, getSolBalance } from './utils/solanaUtils';

const app = express();
const PORT = process.env.PORT || 3001;
const cryptoService = new CryptoService();
let dbConnection: DataSource;
const activeTasks = new Map<string, Position>();
let isWorkerRunning = false;
app.use(express.json());

const rebalanceRouter = Router();

const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';

const REBALANCE_WAITING_PERIOD_MS = 60 * 15 * 1000;

rebalanceRouter.post('/start', async (req, res) => {
    const { positionId } = req.body;
    if (!positionId) return res.status(400).send({ error: 'positionId is required' });

    logger.info(`Received command to start rebalancing for position: ${positionId}`);
    try {
        const positionRepo = dbConnection.getRepository(Position);
        const position = await positionRepo.findOne({ where: { positionId } });
        if (!position) return res.status(404).send({ error: 'Position not found' });
        if (!position.isAutoRebalancing) return res.status(403).send({ error: 'Rebalancing is not enabled' });
        if (activeTasks.has(positionId)) return res.status(200).send({ message: 'Rebalancing already active' });

        position.rebalanceStatus = 'idle';
        position.rebalanceContext = {};
        await positionRepo.save(position);

        activeTasks.set(positionId, position);
        logger.info(`Successfully added position ${positionId} to active tasks.`);
        res.status(202).send({ message: 'Rebalancing task accepted' });
    } catch (error) {
        logger.error(`Failed to process start command for ${positionId}:`, error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

app.use('/rebalance', rebalanceRouter);

rebalanceRouter.get('/position/:positionId/assets', async (req, res) => {
    const { positionId } = req.params;
    if (!positionId) {
        return res.status(400).send({ error: 'positionId is required' });
    }

    logger.info(`[API] Received request for asset composition of position: ${positionId}`);

    try {
        // Инициализируем SDK и кошелек для выполнения запроса
        const walletRecords = await dbConnection.getRepository(SessionWallet).find({
            order: { created_at: 'DESC' }, take: 1,
        });
        if (!walletRecords || walletRecords.length === 0) {
            throw new Error("No session wallet found in DB");
        }
        
        const walletRecord = walletRecords[0];
        const decryptedSecret = cryptoService.decrypt(walletRecord.encrypted_key, walletRecord.iv);
        const ownerWallet = Keypair.fromSecretKey(bs58.decode(decryptedSecret));
        const raydium = await initSdk(new Connection(process.env.RPC_URL!, 'confirmed'), ownerWallet);

        // Используем вашу существующую функцию для получения данных
        const { baseAmount, quoteAmount } = await fetchPositionInfo(raydium, positionId);

        logger.info(`[API] Successfully fetched assets for ${positionId}: Base=${baseAmount}, Quote=${quoteAmount}`);
        
        // Отправляем успешный ответ
        res.status(200).json({
            baseAmount: baseAmount,
            quoteAmount: quoteAmount,
        });

    } catch (error) {
        // Обрабатываем ошибки, например, если позиция не найдена
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        logger.error(`[API] Failed to fetch assets for ${positionId}:`, errorMessage);
        
        if (errorMessage.includes('Position not found')) {
            return res.status(404).send({ error: `Position with ID ${positionId} not found on-chain.` });
        }
        
        res.status(500).send({ error: 'Internal server error while fetching position assets.' });
    }
});

async function runRebalanceLogic(raydium: Raydium, ownerWallet: Keypair, positionData: Position) {
    const positionId = positionData.positionId;
    const positionRepo = dbConnection.getRepository(Position);
    logger.info(`--- [${positionId}] Processing cycle with status: ${positionData.rebalanceStatus} ---`);

    try {
        switch (positionData.rebalanceStatus) {
            case 'idle':
                await handleIdleState(raydium, positionData);
                break;
            case 'closing':
                await handleClosingState(raydium, ownerWallet, positionData);
                break;
            case 'awaiting_confirmation':
                await handleAwaitingConfirmationState(raydium, positionData);
                break;
            case 'opening':
                await handleOpeningState(raydium, ownerWallet, positionData);
                break;
            default:
                logger.warn(`[${positionId}] Unknown rebalance status: ${positionData.rebalanceStatus}. Resetting to 'idle'.`);
                positionData.rebalanceStatus = 'idle';
                await positionRepo.save(positionData);
        }
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`[${positionId}] Unhandled error in state machine for status '${positionData.rebalanceStatus}': ${error.message}`);
        } else {
            logger.error(`[${positionId}] Unknown unhandled error in state machine:`, error);
        }
    }
}

async function handleIdleState(raydium: Raydium, positionData: Position) {
    const positionId = positionData.positionId;
    const positionRepo = dbConnection.getRepository(Position);

    const poolInfo = await getClmmPoolInfo(raydium, positionData.poolId);
    if (!poolInfo) throw new Error(`Failed to fetch CLMM pool info for ${positionData.poolId}.`);

    const ownerPositions = await getOwnerPositions(raydium);
    let activePosition = ownerPositions.find(p => p.nftMint.toBase58() === positionId);

    if (!activePosition) {
        logger.warn(`[${positionId}] Position not found on-chain. Disabling auto-rebalancing.`);
        positionData.isAutoRebalancing = false;
        await positionRepo.save(positionData);
        activeTasks.delete(positionId);
        return;
    }

    activePosition = addPricesToPosition(activePosition, poolInfo);
    const currentPrice = poolInfo.price;
    const isOutOfRange = currentPrice < activePosition.priceLower || currentPrice > activePosition.priceUpper;

    if (isOutOfRange) {
        if (!positionData.outOfRangeSince) {
            logger.info(`[${positionId}] Position is out of range. Starting waiting period.`);
            positionData.outOfRangeSince = new Date();  
            positionData.rebalanceStatus = 'awaiting_confirmation';  
            await positionRepo.save(positionData);
        }
    } else {
        if (positionData.outOfRangeSince) {
            logger.info(`[${positionId}] Price returned to range. Cancelling rebalance.`);
            positionData.outOfRangeSince = null;
            positionData.rebalanceStatus = 'idle';
            await positionRepo.save(positionData);
        }
    }
}

async function handleAwaitingConfirmationState(raydium: Raydium, positionData: Position) {
    const positionId = positionData.positionId;
    const positionRepo = dbConnection.getRepository(Position);

    if (!positionData.outOfRangeSince) {
        logger.warn(`[${positionId}] In awaiting_confirmation state but outOfRangeSince is not set. Resetting to idle.`);
        positionData.rebalanceStatus = 'idle';
        await positionRepo.save(positionData);
        return;
    }

    const timeElapsed = new Date().getTime() - positionData.outOfRangeSince.getTime();

    if (timeElapsed >= REBALANCE_WAITING_PERIOD_MS) {
        logger.info(`[${positionId}] Waiting period finished. Re-checking price before closing position.`);

        // Повторная проверка цены перед окончательным решением
        const poolInfo = await getClmmPoolInfo(raydium, positionData.poolId);
        if (!poolInfo) throw new Error("Failed to get pool info for final check.");
        
        const ownerPositions = await getOwnerPositions(raydium);
        let activePosition = ownerPositions.find(p => p.nftMint.toBase58() === positionId);
        if (!activePosition) { // На случай если позицию закрыли вручную
             positionData.rebalanceStatus = 'idle';
             positionData.outOfRangeSince = null;
             await positionRepo.save(positionData);
             return;
        }
        activePosition = addPricesToPosition(activePosition, poolInfo);

        const isStillOutOfRange = poolInfo.price < activePosition.priceLower || poolInfo.price > activePosition.priceUpper;

        if (isStillOutOfRange) {
            logger.info(`[${positionId}] Price is STILL out of range. Proceeding to close.`);
            positionData.rebalanceStatus = 'closing';
            positionData.outOfRangeSince = null; 
            await positionRepo.save(positionData);
        } else {
            logger.info(`[${positionId}] Price returned to range during waiting period. Cancelling rebalance.`);
            positionData.rebalanceStatus = 'idle';
            positionData.outOfRangeSince = null;
            await positionRepo.save(positionData);
        }
    } else {
        const timeLeft = (REBALANCE_WAITING_PERIOD_MS - timeElapsed) / 1000 / 60;
        logger.info(`[${positionId}] Waiting for rebalance confirmation. Time left: ${timeLeft.toFixed(1)} minutes.`);
    }
}

async function handleClosingState(raydium: Raydium, ownerWallet: Keypair, positionData: Position) {
    const positionId = positionData.positionId;
    const positionRepo = dbConnection.getRepository(Position);
    const poolInfo = await getClmmPoolInfo(raydium, positionData.poolId);
    if (!poolInfo) throw new Error(`Не удалось получить информацию о пуле для закрытия.`);
    
    try {
        const ownerPositions = await getOwnerPositions(raydium);
        const activePosition = ownerPositions.find(p => p.nftMint.toBase58() === positionId);
        if (!activePosition) throw new Error("Позиция уже закрыта или не найдена на блокчейне.");

        const balancesBefore = await getTokenBalances(raydium.connection, ownerWallet.publicKey, new PublicKey(poolInfo.mintA.address), new PublicKey(poolInfo.mintB.address));
        const closeResult = await closePosition(raydium, activePosition);
        if (!closeResult) throw new Error(`Вызов закрытия позиции не вернул результат.`);
        
        logger.info(`[${positionId}] Транзакция(и) закрытия успешно отправлены. Финальный TX: ${closeResult.closeTxId}. Ожидание подтверждения...`);
        await new Promise(resolve => setTimeout(resolve, 8000));

        const balancesAfter = await getTokenBalances(raydium.connection, ownerWallet.publicKey, new PublicKey(poolInfo.mintA.address), new PublicKey(poolInfo.mintB.address));
        
        const baseAmountFromClose = new Decimal(balancesAfter.base - balancesBefore.base);
        const quoteAmountFromClose = new Decimal(balancesAfter.quote - balancesBefore.quote);

        const closingValueUsd = (baseAmountFromClose.div(10 ** poolInfo.mintA.decimals).mul(poolInfo.price))
                                .add(quoteAmountFromClose.div(10 ** poolInfo.mintB.decimals));

        const initialValueUsd = new Decimal(positionData.initialValue);
        const previousCumulativePnlUsd = new Decimal(positionData.cumulativePnlUsd);

        const pnlOfThisPosition = closingValueUsd.sub(initialValueUsd).sub(new Decimal(closeResult.feeUSD));
        
        const newCumulativePnl = previousCumulativePnlUsd.add(pnlOfThisPosition);

        logger.info(`[${positionId}] PNL этой позиции: $${pnlOfThisPosition.toFixed(4)}. Новый накопленный PNL: $${newCumulativePnl.toFixed(4)}`);

        const grossPnlOfCycleUsd = closingValueUsd.sub(initialValueUsd);
        logger.info(`[${positionId}] Стоимость собранных комиссий (Gross PNL): $${grossPnlOfCycleUsd.toFixed(4)}`);

        const futuresHost = process.env.BINANCE_FUTURES_HOST;

        if (futuresHost) {
            logger.info(`[${positionId}] Уведомление сервиса хеджирования (binance) о подготовке к ребалансу.`);

            const url = `http://${futuresHost}/binance/internal/prepare-for-rebalance`;
            
            try {
                await axios.post(url, {
                    positionId: positionId,
                });
                logger.info(`[${positionId}] Сервис binance успешно уведомлен.`);
            } catch (error) {
                logger.error(`[${positionId}] Не удалось уведомить сервис binance. Ошибка:`, error);
            }

        } else {
            logger.warn(`[${positionId}] Хост для биржи 'binance' (BINANCE_FUTURES_HOST) не настроен в .env. Невозможно подготовить хедж.`);
        }

        positionData.rebalanceStatus =  'opening';
        positionData.rebalanceContext = {
            baseAmountFromClose: baseAmountFromClose.toString(),
            quoteAmountFromClose: quoteAmountFromClose.toString(),
            grossPnlOfCycleUsd: grossPnlOfCycleUsd.toNumber(),
            closeOldPositionFeeUSD: closeResult.feeUSD,
            cumulativePnlForNewPosition: newCumulativePnl.toNumber(), 
        };
        await positionRepo.save(positionData);
        logger.info(`[${positionId}] Статус обновлен на 'opening'.`);

    } catch (error) {
        logger.error(`[${positionId}] Не удалось закрыть позицию в состоянии 'closing'. Попытка будет повторена в следующем цикле.`, error);
    }
}

async function handleOpeningState(raydium: Raydium, ownerWallet: Keypair, positionData: Position) {
    const positionId = positionData.positionId;
    const positionRepo = dbConnection.getRepository(Position);
    logger.info(`[${positionId}] --- [OPENING STATE V2] ---`);

    try {
        const poolInfo = await getClmmPoolInfo(raydium, positionData.poolId);
        if (!poolInfo) throw new Error("Не удалось получить информацию о пуле.");

        const { grossPnlOfCycleUsd = 0 } = positionData.rebalanceContext ?? {};

        const initialTargetValueUsd = new Decimal(positionData.initialValue);

        const newTotalTargetValueUsd = initialTargetValueUsd.add(grossPnlOfCycleUsd);
        logger.info(`[${positionId}] Старая цель: $${initialTargetValueUsd.toFixed(4)}. Новая цель с комиссиями: $${newTotalTargetValueUsd.toFixed(4)}`);

        const targetValuePerTokenUSD = newTotalTargetValueUsd.div(2);
        const targetBaseInDecimal = targetValuePerTokenUSD.div(poolInfo.price);
        const targetQuoteInDecimal = targetValuePerTokenUSD;

        const targetBaseAmountBN = new BN(targetBaseInDecimal.mul(10 ** poolInfo.mintA.decimals).toFixed(0));
        const targetQuoteAmountBN = new BN(targetQuoteInDecimal.mul(10 ** poolInfo.mintB.decimals).toFixed(0));

        logger.info(`[${positionId}] Новая цель: ${targetBaseInDecimal.toFixed(6)} ${poolInfo.mintA.symbol} & ${targetQuoteInDecimal.toFixed(6)} ${poolInfo.mintB.symbol}`);

        const currentBalances = await getTokenBalances(raydium.connection, ownerWallet.publicKey, new PublicKey(poolInfo.mintA.address), new PublicKey(poolInfo.mintB.address));
        const currentBaseBN = new BN(currentBalances.base);
        const currentQuoteBN = new BN(currentBalances.quote);
        
        logger.info(`[${positionId}] Текущие балансы: ${new Decimal(currentBaseBN.toString()).div(10 ** poolInfo.mintA.decimals).toFixed(6)} ${poolInfo.mintA.symbol} & ${new Decimal(currentQuoteBN.toString()).div(10 ** poolInfo.mintB.decimals).toFixed(6)} ${poolInfo.mintB.symbol}`);

        const baseShortfall = targetBaseAmountBN.sub(currentBaseBN);
        const quoteShortfall = targetQuoteAmountBN.sub(currentQuoteBN);

        let swapFeeUSD = 0;

        if (baseShortfall.gtn(0)) {
            logger.info(`[${positionId}] Нехватка ${poolInfo.mintA.symbol}. Продаем ${poolInfo.mintB.symbol}...`);
            const price = poolInfo.price;
            const baseShortfallInDecimal = new Decimal(baseShortfall.toString()).div(10 ** poolInfo.mintA.decimals);
            const quoteToSellInDecimal = baseShortfallInDecimal.mul(price);
            const amountToSwap = new BN(quoteToSellInDecimal.mul(1.01).mul(10 ** poolInfo.mintB.decimals).toFixed(0));

            if (amountToSwap.gt(currentQuoteBN)) {
                throw new Error(`Недостаточно ${poolInfo.mintB.symbol} для покрытия дефицита ${poolInfo.mintA.symbol}.`);
            }

            const quote = await getSwapQuote(new PublicKey(poolInfo.mintB.address), new PublicKey(poolInfo.mintA.address), amountToSwap);
            if (quote) {
                const swapResult = await executeSwap(raydium.connection, ownerWallet, quote);
                if (swapResult) {
                    swapFeeUSD = swapResult.feeUSD;
                    logger.info(`[${positionId}] Обмен выполнен. Ожидание 8 сек...`);
                    await new Promise(resolve => setTimeout(resolve, 8000));
                }
            } else {
                 throw new Error("Не удалось получить котировку от Jupiter.");
            }
        } else if (quoteShortfall.gtn(0)) {
            logger.info(`[${positionId}] Нехватка ${poolInfo.mintB.symbol}. Продаем ${poolInfo.mintA.symbol}...`);
            const price = poolInfo.price;
            const quoteShortfallInDecimal = new Decimal(quoteShortfall.toString()).div(10 ** poolInfo.mintB.decimals);
            const baseToSellInDecimal = quoteShortfallInDecimal.div(price);
            const amountToSwap = new BN(baseToSellInDecimal.mul(1.01).mul(10 ** poolInfo.mintA.decimals).toFixed(0));

            if (amountToSwap.gt(currentBaseBN)) {
                throw new Error(`Недостаточно ${poolInfo.mintA.symbol} для покрытия дефицита ${poolInfo.mintB.symbol}.`);
            }
            
            const quote = await getSwapQuote(new PublicKey(poolInfo.mintA.address), new PublicKey(poolInfo.mintB.address), amountToSwap);
             if (quote) {
                const swapResult = await executeSwap(raydium.connection, ownerWallet, quote);
                if (swapResult) {
                    swapFeeUSD = swapResult.feeUSD;
                    logger.info(`[${positionId}] Обмен выполнен. Ожидание 8 сек...`);
                    await new Promise(resolve => setTimeout(resolve, 8000));
                }
            } else {
                 throw new Error("Не удалось получить котировку от Jupiter.");
            }
        } else {
            logger.info(`[${positionId}] Баланса обоих токенов достаточно. Обмен не требуется.`);
        }

        const finalBalances = await getTokenBalances(raydium.connection, ownerWallet.publicKey, new PublicKey(poolInfo.mintA.address), new PublicKey(poolInfo.mintB.address));
        const finalBaseAmountBN = new BN(finalBalances.base);
        
        if (finalBaseAmountBN.lt(targetBaseAmountBN)) {
            logger.warn(`[${positionId}] После обмена все равно не хватает базового токена. Открываем позицию со всем доступным балансом.`);
        }

        const amountToOpenWith = BN.min(finalBaseAmountBN, targetBaseAmountBN);
        
        logger.info(`[${positionId}] Запрашиваем новый диапазон у сервиса...`);
        
        const suggestionServiceUrl = process.env.SUGGESTION_SERVICE_URL || 'http://localhost:8000';
        const valueForSuggestion = (new Decimal(amountToOpenWith.toString()).div(10 ** poolInfo.mintA.decimals)).mul(poolInfo.price);
        const response = await axios.get(`${suggestionServiceUrl}/api/v3/hedge-breakeven-range`, {
            params: {
                pool_id: positionData.poolId,
                initial_lp_value_usd: valueForSuggestion.toNumber() * 2,
                hedge_ratio: 0.2,
                risk_profile: 'aggressive' 
            }
        });
        if (!response.data || !response.data.suggestedRange) throw new Error("Не удалось получить валидный диапазон от сервиса.");

        const { lowerPrice, upperPrice } = response.data.suggestedRange;
        const { tick: lowerTick } = TickUtils.getPriceAndTick({ poolInfo, price: new Decimal(lowerPrice), baseIn: true });
        const { tick: upperTick } = TickUtils.getPriceAndTick({ poolInfo, price: new Decimal(upperPrice), baseIn: true });

        logger.info(`[${positionId}] Открываем новую позицию с ${new Decimal(amountToOpenWith.toString()).div(10**poolInfo.mintA.decimals).toFixed(6)} ${poolInfo.mintA.symbol}`);
        
        const openResult = await openPosition(raydium, poolInfo, Math.min(lowerTick, upperTick), Math.max(lowerTick, upperTick), amountToOpenWith);
        if (!openResult) throw new Error(`Не удалось открыть новую позицию.`);
        
        logger.info(`[${positionId}] Успешно открыта новая позиция. NFT: ${openResult.nftMint.toBase58()}. Комиссия: $${openResult.feeUSD.toFixed(5)}`);
        
        const updatedContext = { ...positionData.rebalanceContext, swapFeeUSD, openNewPositionFeeUSD: openResult.feeUSD };
        await notifyMainBackend(raydium, positionId, openResult, poolInfo, poolInfo.price, { lowerPrice: new Decimal(lowerPrice), upperPrice: new Decimal(upperPrice) }, updatedContext);
        
        logger.info(`[${positionId}] Цикл перебалансировки завершен. Деактивация старой записи.`);
        positionData.isAutoRebalancing = false;
        positionData.rebalanceStatus = 'idle';
        positionData.rebalanceContext = {};
        await positionRepo.save(positionData);
        
        activeTasks.delete(positionId);
        logger.info(`[${positionId}] Задача удалена из активной очереди.`);

    } catch(error) {
        logger.error(`[${positionId}] Ошибка в состоянии 'opening'. Цикл будет повторен.`, error);
    }
}

// async function rebalanceTokens(
//     raydium: Raydium, 
//     wallet: Keypair, 
//     poolInfo: ApiV3PoolInfoConcentratedItem, 
//     currentPrice: number,
//     baseAmountFromClose: number, 
//     quoteAmountFromClose: number
// ): Promise<{ feeUSD: number; finalBase: number; finalQuote: number }> {
//     let totalSwapFee = 0;
//     logger.info('Checking token balances for rebalancing...');
    
//     // Используем изолированные балансы, переданные из контекста
//     let currentBase = new Decimal(baseAmountFromClose);
//     let currentQuote = new Decimal(quoteAmountFromClose);

//     const baseInDecimals = currentBase.div(10 ** poolInfo.mintA.decimals);
//     const quoteInDecimals = currentQuote.div(10 ** poolInfo.mintB.decimals);
//     logger.info(`Using isolated balances for rebalance calculation: Base=${baseInDecimals.toFixed(6)}, Quote=${quoteInDecimals.toFixed(6)}`);

//     const totalValueUSD = (baseInDecimals.mul(currentPrice)).add(quoteInDecimals);
//     if (totalValueUSD.lt(0.01)) {  
//         logger.info('Total value from closed position is too low. Skipping rebalance swap.');
//         return { feeUSD: 0, finalBase: currentBase.toNumber(), finalQuote: currentQuote.toNumber() };
//     };
    
//     const targetValueUSD = totalValueUSD.div(2);
//     const baseValueUSD = baseInDecimals.mul(currentPrice);

//     let swapResult = null;

//     if (baseValueUSD.gt(targetValueUSD)) {
//         // Продаем базовый токен
//         const baseToSell = baseValueUSD.sub(targetValueUSD).div(currentPrice);
//         const amountToSwap = new BN(baseToSell.mul(10 ** poolInfo.mintA.decimals).mul(0.99).toFixed(0)); 
        
//         if (amountToSwap.gtn(0)) {
//             logger.info(`Rebalancing: Swapping ~${baseToSell.toFixed(6)} ${poolInfo.mintA.symbol} for ${poolInfo.mintB.symbol}`);
//             const quote = await getSwapQuote(new PublicKey(poolInfo.mintA.address), new PublicKey(poolInfo.mintB.address), amountToSwap);
//             if (quote) {
//                 swapResult = await executeSwap(raydium.connection, wallet, quote);
//                 await new Promise(resolve => setTimeout(resolve, 8000));
//                 // Обновляем изолированные балансы
//                 currentBase = currentBase.sub(new Decimal(quote.inAmount));
//                 currentQuote = currentQuote.add(new Decimal(quote.outAmount));
//             }
//         }
//     } else if (baseValueUSD.lt(targetValueUSD)) {
//         // Продаем токен котировки
//         const quoteToSell = targetValueUSD.sub(baseValueUSD);
//         const amountToSwap = new BN(quoteToSell.mul(10 ** poolInfo.mintB.decimals).mul(0.99).toFixed(0));

//         if (amountToSwap.gtn(0)) {
//             logger.info(`Rebalancing: Swapping ~${quoteToSell.toFixed(6)} ${poolInfo.mintB.symbol} for ${poolInfo.mintA.symbol}`);
//             const quote = await getSwapQuote(new PublicKey(poolInfo.mintB.address), new PublicKey(poolInfo.mintA.address), amountToSwap);
//             if (quote) {
//                 swapResult = await executeSwap(raydium.connection, wallet, quote);
//                 await new Promise(resolve => setTimeout(resolve, 8000));
//                 // Обновляем изолированные балансы
//                 currentQuote = currentQuote.sub(new Decimal(quote.inAmount));
//                 currentBase = currentBase.add(new Decimal(quote.outAmount));
//             }
//         }
//     } else {
//         logger.info('Token balances from closed position are already balanced. No swap needed.');
//     }

//     if (swapResult) {
//         totalSwapFee = swapResult.feeUSD;
//     }

//     // Возвращаем обновленные балансы и комиссию
//     return { 
//         feeUSD: totalSwapFee, 
//         finalBase: currentBase.toNumber(), 
//         finalQuote: currentQuote.toNumber() 
//     };
// }

async function getTokenBalances(connection: Connection, owner: PublicKey, baseMint: PublicKey, quoteMint: PublicKey) {
    // Определяем, какую функцию использовать для каждого токена
    const getBaseBalance = baseMint.toBase58() === SOL_MINT_ADDRESS 
        ? getSolBalance(connection, owner)
        : getTokenBalance(connection, owner, baseMint);

    const getQuoteBalance = quoteMint.toBase58() === SOL_MINT_ADDRESS
        ? getSolBalance(connection, owner)
        : getTokenBalance(connection, owner, quoteMint);
        
    // Выполняем запросы параллельно
    const [baseBalance, quoteBalance] = await Promise.all([
        getBaseBalance,
        getQuoteBalance,
    ]);
    
    // ВАЖНО: Вычитаем минимальный баланс для газа, если базовый токен - SOL
    // Чтобы бот случайно не потратил весь SOL на комиссию
    if (baseMint.toBase58() === SOL_MINT_ADDRESS) {
        const minSolForGas = parseFloat(process.env.MIN_SOL_BALANCE_FOR_GAS || '0.05') * 1e9; // 0.05 SOL в лампортах
        const adjustedBaseBalance = Math.max(0, baseBalance - minSolForGas);
        return { base: adjustedBaseBalance, quote: quoteBalance };
    }

    return { base: baseBalance, quote: quoteBalance };
}

async function notifyMainBackend(
    raydium: Raydium, 
    oldPositionId: string, 
    newPositionResult: { nftMint: PublicKey; txId: string }, 
    poolInfo: ApiV3PoolInfoConcentratedItem, 
    currentPrice: number,
    targetRange: { lowerPrice: Decimal; upperPrice: Decimal },
    rebalanceContext: any
) {
    const callbackUrl = process.env.CALLBACK_URL;
    if (!callbackUrl) return logger.error("CALLBACK_URL not defined.");

    try {
        const { baseAmount, quoteAmount } = await fetchPositionInfo(raydium, newPositionResult.nftMint.toBase58());
        const initialValue = (parseFloat(baseAmount) * currentPrice) + parseFloat(quoteAmount);
        
        const payload = {
            oldPositionId,
            newPositionData: {
                positionId: newPositionResult.nftMint.toBase58(),
                poolId: poolInfo.id,
                initialBaseAmount: baseAmount,
                initialQuoteAmount: quoteAmount,
                initialPriceA: currentPrice,
                initialPriceB: 1,
                initialValue: initialValue,
                startPrice: targetRange.lowerPrice.toNumber(), 
                endPrice: targetRange.upperPrice.toNumber(),
                cumulativePnlUsd: rebalanceContext.cumulativePnlForNewPosition || 0,
            },
            fees: {
                closeOldPositionFeeUSD: rebalanceContext.closeOldPositionFeeUSD || 0,
                swapFeeUSD: rebalanceContext.swapFeeUSD || 0,
                openNewPositionFeeUSD: rebalanceContext.openNewPositionFeeUSD || 0,
            }
        };
        await axios.post(callbackUrl, payload);
        logger.info(`Successfully notified main backend about rebalance of ${oldPositionId}. New range: ${targetRange.lowerPrice.toNumber()} - ${targetRange.upperPrice.toNumber()}`);
    } catch (error: any) {
        logger.error(`Failed to send callback to main backend:`, error.response?.data || error.message);
        throw new Error("Failed to notify main backend.");
    }
}

async function mainWorkerLoop() {
    if (isWorkerRunning) {
        logger.info("Worker cycle is already in progress. Skipping.");
        return;
    }
    isWorkerRunning = true;

    try {
        if (activeTasks.size === 0) {
            return;
        }
        logger.info(`Worker cycle started. Active tasks: ${activeTasks.size}`);

        let ownerWallet: Keypair, raydium: Raydium;
        try {
            const walletRecords = await dbConnection.getRepository(SessionWallet).find({
                order: { created_at: 'DESC' }, take: 1,
            });
            if (!walletRecords || walletRecords.length === 0) throw new Error("No wallet found");
            
            const walletRecord = walletRecords[0];
            const decryptedSecret = cryptoService.decrypt(walletRecord.encrypted_key, walletRecord.iv);
            ownerWallet = Keypair.fromSecretKey(bs58.decode(decryptedSecret));
            raydium = await initSdk(new Connection(process.env.RPC_URL!, 'confirmed'), ownerWallet);
        } catch (error) {
            logger.error("Failed to initialize wallet or SDK. Skipping cycle.", error);
            isWorkerRunning = false; // Сбрасываем флаг в случае ошибки инициализации
            return;
        }
        
        const tasks = Array.from(activeTasks.values());
        const positionRepo = dbConnection.getRepository(Position);

        const rebalancePromises = tasks.map(async (task) => {
            const freshData = await positionRepo.findOne({ where: { positionId: task.positionId }});
            
            if (!freshData || !freshData.isAutoRebalancing) {
                activeTasks.delete(task.positionId);
                logger.info(`Task for position ${task.positionId} removed as it's no longer marked for rebalancing.`);
            } else {
                activeTasks.set(task.positionId, freshData);
                await runRebalanceLogic(raydium, ownerWallet, freshData);
            }
        });

        await Promise.all(rebalancePromises);
        
        logger.info("All parallel rebalance tasks for this cycle have been processed.");

    } catch (error) {
        logger.error("An unexpected error occurred in the main worker loop:", error);
    } finally {
        isWorkerRunning = false;
        logger.info("Worker cycle finished.");
    }
}

async function startServer() {
    try {
        dbConnection = await AppDataSource.initialize();
        logger.info("Database connection initialized.");
        logger.info("Loading active rebalancing tasks from the database...");
        const positionsToLoad = await dbConnection.getRepository(Position).find({
            where: { isAutoRebalancing: true }
        });

        if (positionsToLoad.length > 0) {
            positionsToLoad.forEach(position => {
                activeTasks.set(position.positionId, position);
                logger.info(`Loaded task for position: ${position.positionId} with status: ${position.rebalanceStatus}`);
            });
            logger.info(`Successfully loaded ${activeTasks.size} active tasks.`);
        } else {
            logger.info("No active rebalancing tasks found in the database to load.");
        }
        app.listen(PORT, () => logger.info(`Rebalancer microservice listening on port ${PORT}`));
        const interval = parseInt(process.env.CHECK_INTERVAL_MS!);
        setInterval(mainWorkerLoop, interval);
    } catch (error) {
        logger.error("Failed to start the service:", error);
        process.exit(1);
    }
}

startServer();
