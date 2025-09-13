import { HedgeLegPlan } from "./hedge-leg-plan.interface";

export interface HedgePlan {
    strategyType: 'GRID' | 'DELTA_NEUTRAL' | 'DUAL_GRID';
    totalValue: number;          
    legs: HedgeLegPlan[];          
    pairName: string;            
    currentPrice?: number;
    leverage?: number;
    baseHedgeAmount?: number;
    range?: { lower: number; upper: number };
    zones?: {
        zone: number;
        entryPrice: number;
        quantity: number;
    }[];
}