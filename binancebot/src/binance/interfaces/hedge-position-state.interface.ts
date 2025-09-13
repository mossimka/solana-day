import { HedgeLegState } from "./hedge-leg-state.interface";
import { AdaptiveOrderSetting } from "./adaptive-order-setting.interface";

export interface HedgePositionState {
    strategyType: 'GRID' | 'DELTA_NEUTRAL' | 'DUAL_GRID';
    pairName: string; 
    totalValue: number; 
    isActive: boolean;
    history: string[];
    isSimulation?: boolean;
    legs: HedgeLegState[]; 
    tradingPair?: string;
    range?: { lower: number; upper: number };
    ordersSettings?: AdaptiveOrderSetting[];
    baseHedgeAmount?: number;
    currentHedgeAmount?: number;
    totalRealizedPnl?: number;
    totalFeesPaid?: number;
    lastAveragePrice?: number;
    leverage?: number;
}