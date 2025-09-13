import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export type RebalanceStatus = 'idle' | 'closing' | 'swapping' | 'opening' | 'awaiting_confirmation';

@Entity('positions')
export class Position {
  @PrimaryGeneratedColumn()
  id!: number; 

  @Column({ name: 'position_id', unique: true })
  positionId!: string;

  @Column({
    type: 'varchar',
    name: 'hedge_exchange',
    nullable: true 
  })
  hedgeExchange?: string;

  @Column({ name: 'pool_id' })
  poolId!: string;

  @Column({ name: 'initial_base_amount' })
  initialBaseAmount!: string;

  @Column({ name: 'initial_quote_amount' })
  initialQuoteAmount!: string;

  @Column('decimal', { name: 'initial_price_a', precision: 20, scale: 8 })
  initialPriceA!: number;

  @Column('decimal', { name: 'initial_price_b', precision: 20, scale: 8 })
  initialPriceB!: number;

  @Column('decimal', { name: 'initial_value', precision: 20, scale: 8 })
  initialValue!: number;

  @Column('decimal', { name: 'start_price', precision: 20, scale: 8, nullable: true })
  startPrice!: number;

  @Column('decimal', { name: 'end_price', precision: 20, scale: 8, nullable: true })
  endPrice!: number;

  @Column({ name: 'is_auto_rebalancing', type: 'boolean', default: false })
  isAutoRebalancing!: boolean;

  @Column({
      name: 'hedge_plan',
      type: 'jsonb',
      nullable: true,
  })
  hedgePlan?: object; 

  @Column({
    type: 'varchar',
    name: 'rebalance_status',
    default: 'idle'
  })
  rebalanceStatus!: RebalanceStatus;

  @Column({ type: 'jsonb', name: 'rebalance_context', nullable: true })
  rebalanceContext?: {
    baseAmountFromClose?: string;
    quoteAmountFromClose?: string;
    grossPnlOfCycleUsd?: number;
    finalBaseForOpening?: string;
    finalQuoteForOpening?: string;
    newPositionId?: string;
    newPositionTx?: string;
    closeOldPositionFeeUSD?: number;
    swapFeeUSD?: number;
    openNewPositionFeeUSD?: number;
    cumulativePnlForNewPosition?: number;
  };

  @Column('decimal', {
    name: 'transaction_costs',
    precision: 20,
    scale: 8,
    default: 0,
  })
  transactionCosts!: number;

  @Column('decimal', {
    name: 'cumulative_pnl_usd',
    precision: 20,
    scale: 8,
    default: 0,
  })
  cumulativePnlUsd!: number;

  @Column({ type: 'timestamptz', nullable: true })
  outOfRangeSince: Date | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}