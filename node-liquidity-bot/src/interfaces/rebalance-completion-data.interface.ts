export interface RebalanceCompletionData {
  oldPositionId: string;
  newPositionData: any;  
  fees: {
    closeOldPositionFeeUSD: number; 
    openNewPositionFeeUSD: number;  
  };
}