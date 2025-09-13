import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
    Raydium,
    CLMM_PROGRAM_ID,
    getPdaPersonalPositionAddress, 
    PositionInfoLayout
} from '@raydium-io/raydium-sdk-v2';
import 'dotenv/config'; 

import { addPricesToPosition, getClmmPoolInfo } from '../services/raydiumService'; 
import logger from '../logger';

const POSITION_NFT_MINT = "8ZarbSo5qZgUyx49qj6wZinvoMSRMcatJ9e5Zs7WrFLd"; 

async function testPriceCalculation() {
    logger.info("--- Запуск ИСПРАВЛЕННОГО скрипта для проверки расчета цен ---");

    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
        logger.error("Ошибка: RPC_URL не найден в вашем .env файле!");
        return;
    }
    const connection = new Connection(rpcUrl, 'confirmed');
    logger.info(`Установлено соединение с RPC: ${rpcUrl}`);

    const owner = Keypair.generate(); 
    const raydium = await Raydium.load({
        owner,
        connection,
        cluster: 'mainnet',
        disableFeatureCheck: true,
    });
    logger.info("Raydium SDK инициализирован в режиме 'только для чтения'.");

    try {
        const targetPositionNft = new PublicKey(POSITION_NFT_MINT);

        const { publicKey: positionPda } = getPdaPersonalPositionAddress(CLMM_PROGRAM_ID, targetPositionNft);
        logger.info(`Рассчитан PDA адрес для позиции: ${positionPda.toBase58()}`);

        const positionAccountInfo = await connection.getAccountInfo(positionPda);

        if (!positionAccountInfo) {
            logger.error(`Критическая ошибка: не удалось получить данные аккаунта для PDA ${positionPda.toBase58()}.`);
            logger.error(`Убедитесь, что NFT Mint ${POSITION_NFT_MINT} указан верно и является CLMM позицией Raydium.`);
            return;
        }

        const positionData = PositionInfoLayout.decode(positionAccountInfo.data);

        logger.info(`Успешно загружены данные для позиции: ${targetPositionNft.toBase58()}`);
        logger.info(`Тик нижний (raw): ${positionData.tickLower}`);
        logger.info(`Тик верхний (raw): ${positionData.tickUpper}`);
        
        const poolId = positionData.poolId.toBase58();
        const poolInfo = await getClmmPoolInfo(raydium, poolId);

        if (!poolInfo) {
            logger.error(`Не удалось загрузить информацию для пула ${poolId}`);
            return;
        }

        logger.info(`Загружена информация для пула: ${poolInfo.id}`);
        logger.info(`Децималы токена A (${poolInfo.mintA.symbol}): ${poolInfo.mintA.decimals}`);
        logger.info(`Децималы токена B (${poolInfo.mintB.symbol}): ${poolInfo.mintB.decimals}`);

        const positionWithPrices = addPricesToPosition(positionData, poolInfo);

        logger.info("\n--- РЕЗУЛЬТАТ РАСЧЕТА ---");
        if (positionWithPrices.priceLower !== undefined && positionWithPrices.priceUpper !== undefined) {
            logger.info(`✅ Рассчитанная нижняя цена: ${positionWithPrices.priceLower}`);
            logger.info(`✅ Рассчитанная верхняя цена: ${positionWithPrices.priceUpper}`);
            logger.info("--- ПРОВЕРКА ЗАВЕРШЕНА УСПЕШНО ---");
            logger.info("Сравните эти значения с теми, что показывает интерфейс Raydium.");
        } else {
            logger.error("--- ❌ НЕУДАЧА: Функция не смогла рассчитать цены. ---");
        }

    } catch (error) {
        logger.error("Произошла критическая ошибка во время выполнения скрипта:", error);
    }
}

testPriceCalculation();