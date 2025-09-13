import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string; 

  @Column({ nullable: true })
  refreshTokenHash?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
