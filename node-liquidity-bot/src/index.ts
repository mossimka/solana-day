import * as dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';

import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/data-source';
import mainRouter from './routes';

// Extend Express Request interface to include cookies
declare global {
    namespace Express {
        interface Request {
            cookies: { [key: string]: string };
        }
    }
}

async function bootstrap() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connected successfully!');
    } catch (error) {
        console.error('❌ Error during Data Source initialization:', error);
        process.exit(1);
    }

    const app = express();
    const PORT = process.env.PORT || 8000; 
    const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:3000`;

    // Configure CORS for production
    app.use(cors({
        origin: [
            FRONTEND_URL,
            'https://sephyra.top',
            'http://localhost:3000'  // Keep for local development
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
    app.use(express.json());

    // Simple cookie parser middleware
    app.use((req, res, next) => {
        req.cookies = {};
        const cookieHeader = req.headers.cookie;
        if (cookieHeader) {
            cookieHeader.split(';').forEach(cookie => {
                const parts = cookie.trim().split('=');
                if (parts.length === 2) {
                    const [name, value] = parts;
                    req.cookies[name] = decodeURIComponent(value);
                }
            });
        }
        next();
    });

    app.use('/api', mainRouter);

    app.get('/', (req, res) => {
        res.send('Liquidity Bot API is running!');
    });

    app.listen(PORT, () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
}

bootstrap();