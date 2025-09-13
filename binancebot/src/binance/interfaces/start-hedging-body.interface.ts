import { HedgePlan } from "./hedge-plan.interface";

export interface StartHedgingBody {
    positionId: string;
    pairName: string;
    totalValue: string;
    range: { lower: string; upper: string };
    hedgePlan?: HedgePlan;  
}