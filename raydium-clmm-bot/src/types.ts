import { PublicKey } from '@solana/web3.js';
import { PositionInfoLayout } from '@raydium-io/raydium-sdk-v2';

export interface TokenBalances {
    base: number;
    quote: number;
    nativeSol: number;
}

export interface PriceData {
    solUsd: number;
}

type ClmmPersonalPosition = ReturnType<typeof PositionInfoLayout.decode>;

export interface ActivePositionInfo {
    nftMint: PublicKey;
    liquidity: string;
    tickLower: number;
    tickUpper: number;
    priceLower: number;
    priceUpper: number;
    rawPositionData: ClmmPersonalPosition;
}