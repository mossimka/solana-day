import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('session_wallet')
export class SessionWallet {
 @PrimaryGeneratedColumn()
 id!: number;

 @Column({ type: 'text' })
 encrypted_key!: string;

 @Column({ type: 'text' })
 iv!: string;

 @CreateDateColumn({ type: 'timestamp' })
 created_at!: Date;
}