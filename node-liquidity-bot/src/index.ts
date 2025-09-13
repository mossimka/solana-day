import * as dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';

import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/data-source';
import mainRouter from './routes';

async function bootstrap() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connected successfully!');
    } catch (error) {
        console.error('❌ Error during Data Source initialization:', error);
        process.exit(1);
    }

    const app = express();
    const PORT = process.env.PORT || 3000;
    const PORT_FRONTEND = process.env.PORT_FRONTEND || 8000;

    app.use(cors({
        origin: `http://localhost:${PORT_FRONTEND}`,
        credentials: true
    }));
    app.use(express.json());

    app.use('/api', mainRouter);

    app.get('/', (req, res) => {
        res.send('Liquidity Bot API is running!');
    });

    app.listen(PORT, () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
}

bootstrap();