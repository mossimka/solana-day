import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, getAccount } from '@solana/spl-token';
import bs58 from 'bs58';
import logger from '../logger';

/**
 * Загружает кошелек из приватного ключа в формате BS58.
 * @param privateKeyBs58 - Приватный ключ.
 * @returns - Экземпляр Keypair.
 */
export function loadWallet(privateKeyBs58: string): Keypair {
    try {
        return Keypair.fromSecretKey(bs58.decode(privateKeyBs58));
    } catch (error) {
        logger.error('Failed to load wallet from private key. Ensure it is a valid BS58 string.');
        throw error;
    }
}

/**
 * Получает баланс нативного SOL.
 * @param connection - Соединение с RPC.
 * @param publicKey - Публичный ключ кошелька.
 * @returns - Баланс в лампортах.
 */
export async function getSolBalance(connection: Connection, publicKey: PublicKey): Promise<number> {
    return connection.getBalance(publicKey);
}

/**
 * Получает баланс указанного токена (не нативного SOL).
 * @param connection - Соединение с RPC.
 * @param owner - PublicKey владельца.
 * @param mint - PublicKey mint-адреса токена.
 * @returns - Баланс в минимальных единицах токена (например, lamports для WSOL).
 */
export async function getTokenBalance(
    connection: Connection,
    owner: PublicKey,
    mint: PublicKey
): Promise<number> {
    // Находим адрес связанного токен-аккаунта
    const tokenAccountPubkey = getAssociatedTokenAddressSync(mint, owner, true);
    
    try {
        const tokenAccountInfo = await getAccount(connection, tokenAccountPubkey);
        return Number(tokenAccountInfo.amount);
    } catch (e: any) {
        // Если аккаунт не найден, это означает, что баланс равен 0.
        if (e.name === 'TokenAccountNotFoundError' || e.message.includes("could not find account")) {
            return 0;
        }
        // Для всех других ошибок пробрасываем их дальше.
        logger.error(`Error fetching token balance for mint ${mint.toBase58()}:`, e);
        throw e;
    }
}