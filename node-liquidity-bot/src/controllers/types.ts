export interface SetupPositionBody {
  poolId: string;
  inputAmount: number;
  priceRangePercent: number;
  baseMint: string;
  quoteMint: string;
  priceRange: any;
  hedgePlan: any;
  exchange: 'binance' | 'bybit';
  strategyType?: 'GRID' | 'DELTA_NEUTRAL';
}

export interface HedgePreviewBody {
  strategyType: 'GRID' | 'DUAL_GRID';
  pairName: string; 
  exchange: 'binance' | 'bybit';
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

export interface AutomatedRangeBody {
  poolId: string;
  initialLpValueUsd: number;
}

export interface ValidateValueBody {
  totalValue: number;
  exchange: 'binance' | 'bybit';
  legs: { tradingPair: string }[];
}