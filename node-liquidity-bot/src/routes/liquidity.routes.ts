import { Router } from 'express';
import { LiquidityController } from '../controllers/liquidity.controller';
import { LiquidityBotService } from '../services/liquidity-bot.service';
import { CryptoService } from '../services/crypto.service';
import { AppDataSource } from '../config/data-source';
import { Position } from '../entities/position.entity';
import { SessionWallet } from '../entities/session-wallet.entity';
import { authMiddleware } from '../middleware/auth.middleware';
import { BinanceKeys } from '../entities/binance-keys.entity';
const router = Router();
const binanceKeysRepository = AppDataSource.getRepository(BinanceKeys);
const positionRepository = AppDataSource.getRepository(Position);
const sessionWalletRepository = AppDataSource.getRepository(SessionWallet);
const cryptoService = new CryptoService();
const liquidityBotService = new LiquidityBotService(
    positionRepository,
    sessionWalletRepository,
    cryptoService,
    binanceKeysRepository
);

const liquidityController = new LiquidityController(liquidityBotService);

router.post('/setup-position', authMiddleware, (req, res) => liquidityController.setupLiquidityPosition(req, res));
router.post('/close-position', authMiddleware, (req, res) => liquidityController.closeLiquidityPosition(req, res));
router.post('/setup-position-test', authMiddleware, (req, res) => liquidityController.setupLiquidityPositionTest(req, res));
router.post('/close-position-test', authMiddleware, (req, res) => liquidityController.closePositionTest(req, res));

router.get('/positions', authMiddleware, (req, res) => liquidityController.getAllPositionInfo(req, res));
router.get('/positions-with-details', authMiddleware, (req, res) => liquidityController.getAllPositionsWithDetails(req, res));
router.get('/position/:nftMint', authMiddleware, (req, res) => liquidityController.getPositionInfo(req, res));
router.get('/position-details/:positionId', authMiddleware, (req, res) => liquidityController.getPositionDetails(req, res));
router.get('/pool/:poolId', authMiddleware, (req, res) => liquidityController.getPoolInfo(req, res));
router.get('/pool/balance/:poolId', authMiddleware, (req, res) => liquidityController.getPoolBalance(req, res));
router.get('/token/price', authMiddleware, (req, res) => liquidityController.getTokenPrice(req, res));
router.get('/valid-pairs', authMiddleware, (req, res) => liquidityController.getValidPairs(req, res));
router.get('/chart-data', authMiddleware, (req, res) => liquidityController.getChartData(req, res));

router.post('/private-key', authMiddleware, (req, res) => liquidityController.savePrivateKey(req, res));
router.get('/active-wallet', authMiddleware, (req, res) => liquidityController.getActiveWallet(req, res));
router.get('/order-settings', authMiddleware, (req, res) => liquidityController.getOrderSettings(req, res));
router.post('/order-settings', authMiddleware, (req, res) => liquidityController.setOrderSettings(req, res));

router.post('/hedge-preview', authMiddleware, (req, res) => liquidityController.getHedgePreview(req, res));
router.post('/recalculate-plan', authMiddleware, (req, res) => liquidityController.recalculateHedgePlan(req, res));
router.post('/start-hedge-simulation-for-existing', authMiddleware, (req, res) => liquidityController.startHedgeSimulationForExisting(req, res));
router.post('/validate-delta-neutral', authMiddleware, (req, res) => liquidityController.validateDeltaNeutralValue(req, res));
router.post('/positions/:positionId/enable-rebalance', authMiddleware, (req, res) => liquidityController.enableRebalance(req, res));
router.post('/positions/:positionId/disable-rebalance', authMiddleware, (req, res) => liquidityController.disableRebalance(req, res));

router.post('/binance/start', authMiddleware, (req, res) => liquidityController.startBinance(req, res));
router.post('/binance/stop', authMiddleware, (req, res) => liquidityController.stopBinance(req, res));
router.get('/futures/balance', authMiddleware, (req, res) => liquidityController.getFuturesAccountBalance(req, res));

router.get('/internal/active-for-hedging', (req, res) => liquidityController.getAllActiveForHedging(req, res));
router.post('/internal/rebalance-completed', (req, res) => liquidityController.handleRebalanceCompletion(req, res));
router.post('/internal/positions/:positionId/update-state', (req, res) => liquidityController.updateHedgeState(req, res));

router.post('/binance/keys', authMiddleware, (req, res) => liquidityController.saveBinanceKeys(req, res));
router.get('/binance/keys', authMiddleware, (req, res) => liquidityController.getBinanceKeys(req, res));
router.delete('/binance/keys', authMiddleware, (req, res) => liquidityController.deleteBinanceKeys(req, res));

export default router;
