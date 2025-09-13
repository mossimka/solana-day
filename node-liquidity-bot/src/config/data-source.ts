import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Position } from '../entities/position.entity';
import { SessionWallet } from '../entities/session-wallet.entity';
import { User } from '../entities/user.entity';
import { BinanceKeys } from '../entities/binance-keys.entity';

dotenv.config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: true, 
    logging: false,
    entities: [Position, SessionWallet, User, BinanceKeys],
    migrations: [],
    subscribers: [],
});