export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'CROSSES_ABOVE' | 'CROSSES_BELOW';
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
  triggeredPrice?: number;
  note?: string;
  acknowledged?: boolean;
}
