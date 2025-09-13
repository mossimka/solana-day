import 'dotenv/config';
import { DataSource } from "typeorm";
import { Position } from "./entities/position.entity";
import { SessionWallet } from "./entities/session-wallet.entity";

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false,  
    logging: false,
    entities: [Position, SessionWallet],
    migrations: [],
    subscribers: [],
});