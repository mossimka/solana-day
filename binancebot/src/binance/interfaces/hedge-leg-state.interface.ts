import { AdaptiveOrderSetting } from "./adaptive-order-setting.interface";

export interface HedgeLegState {
    tradingPair: string; 
    currentHedgeAmount: number;
    lastAveragePrice: number;
    totalRealizedPnl: number;
    totalFeesPaid: number;
    leverage: number;
    ordersSettings: AdaptiveOrderSetting[];
}