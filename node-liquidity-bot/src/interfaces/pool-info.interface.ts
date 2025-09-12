export interface PoolInfo {
  poolId: string;
  baseMint: string;
  quoteMint: string;
  currentPrice: number;
  binancePairSymbol?: string;
}

export interface PositionInfo {
  positionId: string;
  baseAmount: string;
  quoteAmount: string;
  priceRange: { lower: number; upper: number };
  currentPrice: number;
  profitability: number;
  actionHistory: string[];
  poolKeys: { id: string };
}
