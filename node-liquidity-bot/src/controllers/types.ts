export interface SetupPositionBody {
  poolId: string;
  inputAmount: number;
  priceRangePercent: number;
  baseMint: string;
  quoteMint: string;
  priceRange: any;
  hedgePlan: any;
  exchange: 'binance'; 
  strategyType?: 'GRID' | 'DELTA_NEUTRAL';
}

export interface HedgePreviewBody {
  strategyType: 'GRID' | 'DUAL_GRID';
  pairName: string; 
  exchange: 'binance'; 
  legs: {
      binancePairSymbol: string;
      baseMint: string;
      inputAmount: number;
      priceRangePercent: number;
  }[];
}

export interface RecalculatePlanBody {
    positionId: string;
    plan: any;
}

export interface ValidateValueBody {
  totalValue: number;
  exchange: 'binance'; 
  legs: { tradingPair: string }[];
}