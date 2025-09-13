import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('session_wallet')
export class SessionWallet {
  @PrimaryGeneratedColumn()
  id!: number; // FIX: Added '!'

  @Column({ type: 'text' })
  encrypted_key!: string; // FIX: Added '!'

  @Column({ type: 'text' })
  iv!: string; // FIX: Added '!'

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date; // FIX: Added '!'
}