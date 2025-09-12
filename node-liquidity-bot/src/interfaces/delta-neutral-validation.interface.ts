export interface DeltaNeutralValidationBody {
  totalValue: number;
  exchange: 'binance' | 'bybit';
  legs: { tradingPair: string }[];
}