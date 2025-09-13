import { Connection, Keypair } from '@solana/web3.js';
import { Raydium, TxVersion } from '@raydium-io/raydium-sdk-v2';
import logger from '../logger'; 
 
export const txVersion: TxVersion = 1;

export async function initSdk(
  connection: Connection,
  owner: Keypair,
  cluster: string = 'mainnet', 
): Promise<Raydium> {
  logger.info(`Initializing Raydium SDK v2 for wallet: ${owner.publicKey.toBase58()}`);
  
  const raydium = await Raydium.load({
    owner,
    connection,
    cluster: cluster as any,
    disableFeatureCheck: true, 
  });

  logger.info("Raydium SDK v2 initialized successfully.");
  return raydium;
}