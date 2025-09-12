export interface OrderSetting {
  amount: number;
  isProcessed?: boolean;
  orderPrice?: number;
}

export interface OrderRequest {
  orderSettings: OrderSetting[];
  initialAmount: string;
}
