"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiquidityController = void 0;
class LiquidityController {
    constructor(liquidityBotService) {
        this.liquidityBotService = liquidityBotService;
    }
    handleError(res, error, defaultStatus = 500) {
        if (error instanceof Error) {
            console.error(`Controller Error: ${error.message}`);
            const statusCode = error.message.toLowerCase().includes('not found') ? 404 : defaultStatus;
            res.status(statusCode).json({ message: error.message });
        }
        else {
            console.error('An unexpected error occurred', error);
            res.status(500).json({ message: 'An unexpected error occurred' });
        }
    }
    async setupLiquidityPosition(req, res) {
        try {
            const body = req.body;
            const result = await this.liquidityBotService.setupLiquidityPosition(body, body.hedgePlan);
            res.status(201).json(result);
        }
        catch (error) {
            this.handleError(res, error, 400);
        }
    }
    async closeLiquidityPosition(req, res) {
        try {
            const { nftMint } = req.body;
            if (!nftMint)
                return res.status(400).json({ message: 'nftMint is required' });
            const result = await this.liquidityBotService.closePosition(nftMint);
            res.json(result);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async setupLiquidityPositionTest(req, res) {
        try {
            const params = req.body;
            if (!params.poolId || !params.inputAmount || !params.priceRangePercent || !params.exchange) {
                return res.status(400).json({ message: 'poolId, inputAmount, priceRangePercent and exchange are required for test setup.' });
            }
            const result = await this.liquidityBotService.setupLiquidityPosition_Test(params);
            res.json(result);
        }
        catch (error) {
            this.handleError(res, error, 400);
        }
    }
    async closePositionTest(req, res) {
        try {
            const { nftMint } = req.body;
            if (!nftMint)
                return res.status(400).json({ message: 'nftMint is required' });
            const result = await this.liquidityBotService.closePosition_Test(nftMint);
            res.json(result);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getPositionInfo(req, res) {
        try {
            const { nftMint } = req.params;
            const positionInfo = await this.liquidityBotService.fetchPositionInfo(nftMint);
            res.json(positionInfo);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getAllPositionInfo(req, res) {
        try {
            const positionInfo = await this.liquidityBotService.fetchAllPositions();
            res.json(positionInfo);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getAllPositionsWithDetails(req, res) {
        try {
            const positions = await this.liquidityBotService.fetchAllPositionsWithDetails();
            res.json(positions);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getPositionDetails(req, res) {
        try {
            const { positionId } = req.params;
            const result = await this.liquidityBotService.getPositionDetails(positionId);
            res.json(result);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getPoolInfo(req, res) {
        try {
            const { poolId } = req.params;
            const poolInfo = await this.liquidityBotService.getPoolInfo(poolId);
            res.json(poolInfo);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getTokenPrice(req, res) {
        try {
            const symbols = req.query.symbols;
            if (!symbols)
                return res.status(400).json({ message: 'Query parameter "symbols" is required' });
            const prices = await this.liquidityBotService.getTokenPrices(symbols);
            res.json(prices);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getPoolBalance(req, res) {
        try {
            const { poolId } = req.params;
            const balance = await this.liquidityBotService.getBalanceByPool(poolId);
            res.json(balance);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getValidPairs(req, res) {
        try {
            const pairs = await this.liquidityBotService.getValidPairs();
            res.json(pairs);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getHighAprPools(req, res) {
        try {
            const pools = await this.liquidityBotService.getHighAprPools();
            res.json(pools);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getChartData(req, res) {
        try {
            const { poolId, resolution, from, to } = req.query;
            if (!poolId || !resolution || !from || !to) {
                return res.status(400).json({ message: 'Missing required query parameters for chart data.' });
            }
            const fromTimestamp = parseInt(from, 10);
            const toTimestamp = parseInt(to, 10);
            const result = await this.liquidityBotService.getChartData(poolId, resolution, fromTimestamp, toTimestamp);
            res.json(result);
        }
        catch (error) {
            this.handleError(res, error, 504);
        }
    }
    async savePrivateKey(req, res) {
        try {
            const { privateKey } = req.body;
            if (!privateKey)
                return res.status(400).json({ message: 'privateKey is required' });
            await this.liquidityBotService.savePrivateKey(privateKey);
            res.json({ message: 'Private key saved successfully.' });
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getActiveWallet(req, res) {
        try {
            const wallet = await this.liquidityBotService.getActiveWallet();
            res.json(wallet);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getOrderSettings(req, res) {
        try {
            const settings = await this.liquidityBotService.currentOrderSettings();
            res.json(settings);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async setOrderSettings(req, res) {
        try {
            const { orderSettings, initialAmount } = req.body;
            await this.liquidityBotService.setOrderSettings(orderSettings, initialAmount);
            res.json({ message: 'Order settings updated successfully' });
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getHedgePreview(req, res) {
        try {
            const result = await this.liquidityBotService.getHedgePreview(req.body);
            res.json(result);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async recalculateHedgePlan(req, res) {
        try {
            const body = req.body;
            if (!body.positionId || !body.plan) {
                return res.status(400).json({ message: 'positionId and plan are required.' });
            }
            const result = await this.liquidityBotService.recalculateHedgePlan(body.positionId, body.plan);
            res.json(result);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getAutomatedRange(req, res) {
        try {
            const body = req.body;
            if (!body.poolId || typeof body.initialLpValueUsd !== 'number') {
                return res.status(400).json({ message: 'poolId (string) and initialLpValueUsd (number) are required.' });
            }
            const result = await this.liquidityBotService.getAutomatedRange(body.poolId, body.initialLpValueUsd);
            res.json(result);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async startHedgeSimulationForExisting(req, res) {
        try {
            if (!req.body.positionId)
                return res.status(400).json({ message: 'positionId is required.' });
            const result = await this.liquidityBotService.startHedgeSimulationForExisting(req.body);
            res.json(result);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async validateDeltaNeutralValue(req, res) {
        try {
            const body = req.body;
            if (!body.totalValue || !body.exchange || !body.legs || body.legs.length === 0) {
                return res.status(400).json({ message: 'totalValue, exchange, and legs are required for validation.' });
            }
            const result = await this.liquidityBotService.validateDeltaNeutralValue(body);
            res.json(result);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async enableRebalance(req, res) {
        try {
            const { positionId } = req.params;
            await this.liquidityBotService.enableRebalance(positionId);
            res.json({ message: 'Rebalancing enabled and task sent to worker.' });
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async disableRebalance(req, res) {
        try {
            const { positionId } = req.params;
            await this.liquidityBotService.disableRebalance(positionId);
            res.json({ message: 'Rebalancing disabled. Worker will stop processing on the next cycle.' });
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async startBinance(req, res) {
        try {
            await this.liquidityBotService.startBinance();
            res.json({ message: 'Start command sent to Binance service.' });
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async stopBinance(req, res) {
        try {
            await this.liquidityBotService.stopBinance();
            res.json({ message: 'Stop command sent to Binance service.' });
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getFuturesAccountBalance(req, res) {
        try {
            const exchange = req.params.exchange;
            if (exchange !== 'binance' && exchange !== 'bybit') {
                return res.status(400).json({ message: 'Invalid exchange specified. Use "binance" or "bybit".' });
            }
            const result = await this.liquidityBotService.getFuturesAccountBalance(exchange);
            res.json(result);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getAllActiveForHedging(req, res) {
        try {
            const result = await this.liquidityBotService.getAllActiveForHedging();
            res.json(result);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async handleRebalanceCompletion(req, res) {
        try {
            await this.liquidityBotService.handleRebalanceCompletion(req.body);
            res.json({ message: 'Callback received and processed.' });
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async updateHedgeState(req, res) {
        try {
            const { positionId } = req.params;
            const result = await this.liquidityBotService.updateHedgeState(positionId, req.body);
            res.json(result);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
}
exports.LiquidityController = LiquidityController;
