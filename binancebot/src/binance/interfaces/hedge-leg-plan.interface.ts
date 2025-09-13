export interface HedgeLegPlan {
    tradingPair: string;       
    leverage: number;
    baseHedgeAmount: number;   
    targetPnl: number;         
    range: { lower: number; upper: number }; 
    zones: {
        zone: number;
        entryPrice: number;
        quantity: number;
    }[];
}