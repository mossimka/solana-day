export interface ValidateValueBody {
    totalValue: number;
    legs: { tradingPair: string }[];
}