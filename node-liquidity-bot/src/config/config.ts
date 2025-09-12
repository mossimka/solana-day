import { Connection, Keypair } from '@solana/web3.js';
import { Raydium, TxVersion } from '@raydium-io/raydium-sdk-v2';

export const txVersion: TxVersion = 1;

export async function initSdk(
  connection: Connection,
  owner: Keypair,
  cluster: string,
): Promise<Raydium> {
  const raydium = await Raydium.load({
    connection,
    owner,
    cluster: cluster as any,
    disableFeatureCheck: true,
  });
  return raydium;
}