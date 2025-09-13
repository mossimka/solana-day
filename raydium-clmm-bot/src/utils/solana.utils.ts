import { Keypair } from '@solana/web3.js';
// ===== ИСПРАВЛЕНИЕ: Меняем стиль импорта =====
import bs58 from 'bs58'; 

/**
 * Создает Keypair из приватного ключа в формате base58.
 * @param secretKey Приватный ключ в виде строки base58.
 * @returns Keypair
 */
export function createWalletFromSecretKey(secretKey: string): Keypair {
  try {
    // Этот код теперь будет работать правильно
    const secretKeyBytes = bs58.decode(secretKey);
    return Keypair.fromSecretKey(secretKeyBytes);
  } catch (error) {
    console.error('Failed to create wallet from base58 secret key:', error);
    throw new Error('Invalid base58 secret key provided.');
  }
}