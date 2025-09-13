import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('binance_keys')
export class BinanceKeys {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    encrypted_api_key!: string;

    @Column()
    encrypted_secret_key!: string;

    @Column()
    iv_api!: string;

    @Column()
    iv_secret!: string;

    @CreateDateColumn()
    created_at!: Date;

    constructor(partial: Partial<BinanceKeys> = {}) {
        Object.assign(this, partial);
    }
}