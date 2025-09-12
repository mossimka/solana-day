export interface UserParams {
  poolId?: string; 
  baseMint: string;
  quoteMint: string;
  inputAmount: number;
  priceRangePercent: number;
  priceRange: {
    lower: number;
    upper: number;
  };
  hedgePlan?: any;
  exchange: 'binance' | 'bybit';
}