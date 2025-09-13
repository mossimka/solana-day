import { Request, Response } from 'express';
import { LiquidityBotService } from '../services/liquidity-bot.service';
import { UserParams } from '../interfaces/user-params.interface';
import { OrderRequest } from '../interfaces/futures.interface';
import {
  HedgePreviewBody,
  RecalculatePlanBody,
  SetupPositionBody,
  ValidateValueBody
} from './types';

export class LiquidityController {
    constructor(private liquidityBotService: LiquidityBotService) {}

    private handleError(res: Response, error: unknown, defaultStatus = 500) {
        if (error instanceof Error) {
            console.error(`Controller Error: ${error.message}`);
            const statusCode = error.message.toLowerCase().includes('not found') ? 404 : defaultStatus;
            res.status(statusCode).json({ message: error.message });
        } else {
            console.error('An unexpected error occurred', error);
            res.status(500).json({ message: 'An unexpected error occurred' });
        }
    }

    async setupLiquidityPosition(req: Request, res: Response) {
        try {
            const body: SetupPositionBody = req.body;
            const result = await this.liquidityBotService.setupLiquidityPosition(body, body.hedgePlan);
            res.status(201).json(result);
        } catch (error) {
            this.handleError(res, error, 400);
        }
    }

    async closeLiquidityPosition(req: Request, res: Response) {
        try {
            const { nftMint } = req.body;
            if (!nftMint) return res.status(400).json({ message: 'nftMint is required' });
            const result = await this.liquidityBotService.closePosition(nftMint);
            res.json(result);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async setupLiquidityPositionTest(req: Request, res: Response) {
        try {
            const params: UserParams = req.body;
            if (!params.poolId || !params.inputAmount || !params.priceRangePercent || !params.exchange) {
                return res.status(400).json({ message: 'poolId, inputAmount, priceRangePercent and exchange are required for test setup.' });
            }
            const result = await this.liquidityBotService.setupLiquidityPosition_Test(params);
            res.json(result);
        } catch(error) {
            this.handleError(res, error, 400);
        }
    }
    
    async closePositionTest(req: Request, res: Response) {
        try {
            const { nftMint } = req.body;
            if (!nftMint) return res.status(400).json({ message: 'nftMint is required' });
            const result = await this.liquidityBotService.closePosition_Test(nftMint);
            res.json(result);
        } catch(error) {
            this.handleError(res, error);
        }
    }

    async getPositionInfo(req: Request, res: Response) {
        try {
            const { nftMint } = req.params;
            const positionInfo = await this.liquidityBotService.fetchPositionInfo(nftMint);
            res.json(positionInfo);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getAllPositionInfo(req: Request, res: Response) {
        try {
            const positionInfo = await this.liquidityBotService.fetchAllPositions();
            res.json(positionInfo);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getAllPositionsWithDetails(req: Request, res: Response) {
        try {
            const positions = await this.liquidityBotService.fetchAllPositionsWithDetails();
            res.json(positions);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getPositionDetails(req: Request, res: Response) {
        try {
            const { positionId } = req.params;
            const result = await this.liquidityBotService.getPositionDetails(positionId);
            res.json(result);
        } catch(error) {
            this.handleError(res, error);
        }
    }

    async getPoolInfo(req: Request, res: Response) {
        try {
            const { poolId } = req.params;
            const poolInfo = await this.liquidityBotService.getPoolInfo(poolId);
            res.json(poolInfo);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getTokenPrice(req: Request, res: Response) {
        try {
            const symbols = req.query.symbols as string;
            if (!symbols) return res.status(400).json({ message: 'Query parameter "symbols" is required' });
            const prices = await this.liquidityBotService.getTokenPrices(symbols);
            res.json(prices);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getPoolBalance(req: Request, res: Response) {
        try {
            const { poolId } = req.params;
            const balance = await this.liquidityBotService.getBalanceByPool(poolId);
            res.json(balance);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getValidPairs(req: Request, res: Response) {
        try {
            const pairs = await this.liquidityBotService.getValidPairs();
            res.json(pairs);
        } catch(error) {
            this.handleError(res, error);
        }
    }
    
    async getChartData(req: Request, res: Response) {
        try {
            const { poolId, resolution, from, to } = req.query;
            if (!poolId || !resolution || !from || !to) {
                return res.status(400).json({ message: 'Missing required query parameters for chart data.' });
            }
            const fromTimestamp = parseInt(from as string, 10);
            const toTimestamp = parseInt(to as string, 10);
            const result = await this.liquidityBotService.getChartData(poolId as string, resolution as string, fromTimestamp, toTimestamp);
            res.json(result);
        } catch(error) {
            this.handleError(res, error, 504);
        }
    }

    async savePrivateKey(req: Request, res: Response) {
        try {
            const { privateKey } = req.body;
            if (!privateKey) return res.status(400).json({ message: 'privateKey is required' });
            await this.liquidityBotService.savePrivateKey(privateKey);
            res.json({ message: 'Private key saved successfully.' });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getActiveWallet(req: Request, res: Response) {
        try {
            const wallet = await this.liquidityBotService.getActiveWallet();
            res.json(wallet);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getOrderSettings(req: Request, res: Response) {
        try {
            const settings = await this.liquidityBotService.currentOrderSettings();
            res.json(settings);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async setOrderSettings(req: Request, res: Response) {
        try {
            const { orderSettings, initialAmount } = req.body as OrderRequest;
            await this.liquidityBotService.setOrderSettings(orderSettings, initialAmount);
            res.json({ message: 'Order settings updated successfully' });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getHedgePreview(req: Request, res: Response) {
        try {
            const result = await this.liquidityBotService.getHedgePreview(req.body as HedgePreviewBody);
            res.json(result);
        } catch(error) {
            this.handleError(res, error);
        }
    }

    async recalculateHedgePlan(req: Request, res: Response) {
        try {
            const body: RecalculatePlanBody = req.body;
            if (!body.positionId || !body.plan) {
                return res.status(400).json({ message: 'positionId and plan are required.' });
            }
            const result = await this.liquidityBotService.recalculateHedgePlan(body.positionId, body.plan);
            res.json(result);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async startHedgeSimulationForExisting(req: Request, res: Response) {
        try {
            if (!req.body.positionId) return res.status(400).json({ message: 'positionId is required.' });
            const result = await this.liquidityBotService.startHedgeSimulationForExisting(req.body);
            res.json(result);
        } catch(error) {
            this.handleError(res, error);
        }
    }

    async validateDeltaNeutralValue(req: Request, res: Response) {
        try {
            const body: ValidateValueBody = req.body;
             if (!body.totalValue || !body.exchange || !body.legs || body.legs.length === 0) {
                return res.status(400).json({ message: 'totalValue, exchange, and legs are required for validation.' });
            }
            const result = await this.liquidityBotService.validateDeltaNeutralValue(body);
            res.json(result);
        } catch(error) {
            this.handleError(res, error);
        }
    }
    
    async enableRebalance(req: Request, res: Response) {
        try {
            const { positionId } = req.params;
            await this.liquidityBotService.enableRebalance(positionId);
            res.json({ message: 'Rebalancing enabled and task sent to worker.' });
        } catch(error) {
            this.handleError(res, error);
        }
    }

    async disableRebalance(req: Request, res: Response) {
        try {
            const { positionId } = req.params;
            await this.liquidityBotService.disableRebalance(positionId);
            res.json({ message: 'Rebalancing disabled. Worker will stop processing on the next cycle.' });
        } catch(error) {
            this.handleError(res, error);
        }
    }

    async startBinance(req: Request, res: Response) {
        try {
            await this.liquidityBotService.startBinance();
            res.json({ message: 'Start command sent to Binance service.' });
        } catch (error) {
            this.handleError(res, error);
        }
    }
    
    async stopBinance(req: Request, res: Response) {
        try {
            await this.liquidityBotService.stopBinance();
            res.json({ message: 'Stop command sent to Binance service.' });
        } catch (error) {
            this.handleError(res, error);
        }
    }
    
    async getFuturesAccountBalance(req: Request, res: Response) {
        try {
            const result = await this.liquidityBotService.getFuturesAccountBalance();
            res.json(result);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getAllActiveForHedging(req: Request, res: Response) {
        try {
            const result = await this.liquidityBotService.getAllActiveForHedging();
            res.json(result);
        } catch (error) {
            this.handleError(res, error);
        }
    }
    
    async handleRebalanceCompletion(req: Request, res: Response) {
        try {
            await this.liquidityBotService.handleRebalanceCompletion(req.body);
            res.json({ message: 'Callback received and processed.' });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async updateHedgeState(req: Request, res: Response) {
        try {
            const { positionId } = req.params;
            const result = await this.liquidityBotService.updateHedgeState(positionId, req.body);
            res.json(result);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async saveBinanceKeys(req: Request, res: Response) {
        try {
            const { apiKey, secretKey } = req.body;
            
            if (!apiKey || !secretKey) {
                return res.status(400).json({ 
                    message: 'Both API key and Secret key are required' 
                });
            }

            await this.liquidityBotService.saveBinanceKeys({ apiKey, secretKey });
            res.status(200).json({ message: 'Binance API keys saved successfully' });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getBinanceKeys(req: Request, res: Response) {
        try {
            const keys = await this.liquidityBotService.getBinanceKeys();
            if (!keys) {
                return res.status(404).json({ 
                    message: 'No Binance API keys found' 
                });
            }
            // Возвращаем только информацию о наличии ключей, без их значений
            res.json({ hasKeys: true });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async deleteBinanceKeys(req: Request, res: Response) {
        try {
            await this.liquidityBotService.deleteBinanceKeys();
            res.json({ message: 'Binance API keys deleted successfully' });
        } catch (error) {
            this.handleError(res, error);
        }
    }
}
