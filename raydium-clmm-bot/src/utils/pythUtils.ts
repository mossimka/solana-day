import { Connection, PublicKey } from '@solana/web3.js';
import 'dotenv/config';
import logger from '../logger';
import { PriceData } from '../types';

const connection = new Connection(process.env.RPC_URL!, 'confirmed');

function parseCustomPriceData(data: Buffer): number | null {
    try {
        // Цена хранится как8-байтовое число (i64) со смещением 32
        const price = data.readBigInt64LE(32);
        // Экспонента хранится как 4-байтовое число (i32) со смещением 44
        const exponent = data.readInt32LE(44);

        // Преобразуем в число с плавающей точкой
        return Number(price) * (10 ** exponent);
    } catch (e) {
        logger.error("Ошибка при ручном парсинге данных Pyth:", e);
        return null;
    }
}

export async function getMarketPrices(): Promise<PriceData> {
    
    const priceFeedAccount = process.env.PYTH_SOL_USD_PRICE_FEED_ID;
    if (!priceFeedAccount) {
        throw new Error('PYTH_SOL_USD_PRICE_FEED_ID не определен в .env файле');
    }

    try {
        const priceFeedKey = new PublicKey(priceFeedAccount);
        const accountInfo = await connection.getAccountInfo(priceFeedKey);

        if (!accountInfo) {
            throw new Error(`Не удалось загрузить данные аккаунта для ${priceFeedAccount}`);
        }

        const solUsd = parseCustomPriceData(accountInfo.data);

        if (solUsd === null) {
            throw new Error(`Не удалось раскодировать цену из аккаунта ${priceFeedAccount}`);
        }

        logger.info(`Fetched prices: SOL/USD = ${solUsd}`);
        return { solUsd };

    } catch (error) {
        if (error instanceof Error) {
            logger.error('Ошибка при получении цен Pyth:', error.message);
        } else {
            logger.error('Произошла неизвестная ошибка в Pyth:', error);
        }
        throw error;
    }
}