export interface StartDeltaNeutralHedgingBody {
    positionId: string; 
    pairName: string;   
    tradingPair: string;
    totalValue: number;
    range: { lower: number; upper: number };
    leverage: number;
}