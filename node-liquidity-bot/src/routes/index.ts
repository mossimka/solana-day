import { Router } from 'express';
import liquidityRoutes from '../routes/liquidity.routes';
import authRoutes from '../routes/auth.routes';

const mainRouter = Router();

mainRouter.use('/liquidity', liquidityRoutes);
mainRouter.use('/auth', authRoutes); 

export default mainRouter;