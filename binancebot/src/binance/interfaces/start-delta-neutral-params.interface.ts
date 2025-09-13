export interface StartDualDeltaNeutralParams {
    positionId: string;
    pairName: string; 
    totalValue: number;
    isSimulation?: boolean;
    legs: [
        { tradingPair: string; leverage: number; }, 
        { tradingPair: string; leverage: number; }  
    ]
}