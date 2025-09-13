export interface AdaptiveOrderSetting {
    amount: number;
    isProcessed?: boolean;
    orderPrice?: number;
    originalAmount: number;
    amountToFill: number;
    amountFilledInZone: number;
    zone: number;
    timesEntered: number;
    lowWaterMark?: number;
}
