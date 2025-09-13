import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

logger.info('.env file loaded.');

export const initializeConfig = () => {};