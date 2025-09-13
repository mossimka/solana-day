// Migrated types from old_front with refinements for stricter typing and future extensibility
// Source: old_front/front — копия/src/types.ts

export type StrategyType = "GRID" | "DUAL_GRID" | "DELTA_NEUTRAL";

export interface HedgePlanZoneSetting {
  zone: number;
  amount: number;
  orderPrice: number;
  isProcessed: boolean;
  amountToFill: number;
  originalAmount: number;
  amountFilledInZone: number;
}

export interface HedgeZone {
  zone: number;
  entryPrice: number | string;
  quantity: number | string;
}

export interface HedgeLegPlan {
  tradingPair: string; // e.g. SOLUSDT
  leverage: number | string;
  baseHedgeAmount: number | string;
  zones: HedgeZone[];
}

export interface FullHedgePlan {
  strategyType: StrategyType;
  totalValue?: number;
  pairName?: string; // e.g. SOL/USDC
  legs: HedgeLegPlan[];
  currentPrice?: number;
  range?: { lower: number; upper: number };
  history?: string[];
  isActive?: boolean;
}

export interface Pool {
  poolId: string;
  baseMint: string;
  quoteMint: string;
}

export interface HedgePlan {
  currentPrice: number;
  leverage: number | string;
  baseHedgeAmount: number | string;
  zones: HedgeZone[];
}

export interface HedgeLegDetails {
  tradingPair: string;
  currentPrice: number;
  currentZone: number;
  hedgePositionSize: number;
  unrealizedPnl: number;
  realizedPnl: number;
  feesPaid: number;
  avgEntryPrice: number;
}

export interface PositionDetails {
  pairName?: string;
  strategyType?: StrategyType;
  isActive?: boolean;
  hedgePnl?: number;
  history?: string[];
  initialValue?: string | number;
  error?: string;
  legs?: HedgeLegDetails[];
}

export interface PositionWithDetails {
  positionId: string;
  initialValue: string | number;
  profitability: number; // LP P&L percentage
  baseAmount?: string;
  quoteAmount?: string;
  priceRange?: { lower: number; upper: number };
  currentPrice?: number;
  isAutoRebalancing?: boolean;
  rebalanceStatus?: string;
  hedgePlan?: FullHedgePlan;
  details: PositionDetails;
}

export interface Balance {
  amount: number;
  valueInUSD: number;
}
export interface BalanceResponse {
  [token: string]: Balance;
}

export interface ValidPair {
  poolId: string;
  baseMint: string;
  quoteMint: string;
  binancePairSymbol?: string;
  baseCexSymbol?: string;
  quoteCexSymbol?: string;
}

export interface ApiHedgeZone {
  zone: number;
  quantity: number;
  entryPrice: number;
}

export interface MatchResult {
  raydiumPoolId: string;
  raydiumPair: string;
  poolType: "Volatile/Stable" | "Volatile/Volatile";
  requiredFutures: string[];
  exchanges: ("Bybit" | "Binance")[];
  apr24h: number;
  liquidity: number;
  fees24h: number;
}

export interface FuturesBalanceResponse {
  availableBalance?: string; // binance
  walletBalance?: string; // bybit
}

export type Exchange = "binance" | "bybit";

// UI Helper Types
export interface HedgePlanUpdatePayload extends FullHedgePlan {}

export interface SetupPayload {
  poolId: string;
  inputAmount: number;
  priceRangePercent: number;
  hedgePlan?: FullHedgePlan;
  strategyType: StrategyType;
  exchange: Exchange;
}

export interface AutomatedRangeResponse {
  suggestedRange?: { lowerPrice: number; upperPrice: number };
}

export interface DeltaNeutralValidationResponse {
  isValid: boolean;
  message?: string;
}
