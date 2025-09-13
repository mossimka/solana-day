export interface CalculationParams {
    strategyType: 'GRID' | 'DUAL_GRID';
    totalValue: string;
    pairName: string; 
    legs: {
        binanceSymbol: string;
        range: { lower: string; upper: string };
    }[];
}