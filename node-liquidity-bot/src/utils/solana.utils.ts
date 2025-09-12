import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58'; 

export function createWalletFromSecretKey(secretKey: string): Keypair {
  try {
    const secretKeyBytes = bs58.decode(secretKey);
    return Keypair.fromSecretKey(secretKeyBytes);
  } catch (error) {
    console.error('Failed to create wallet from base58 secret key:', error);
    throw new Error('Invalid base58 secret key provided.');
  }
}