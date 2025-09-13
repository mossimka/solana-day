import { Injectable, Logger, OnModuleInit, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios'; 
import { Observable, firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';


import { BinanceFuturesWebsocketService } from './services/binance-futures-websocket.service';

import { CreateOrderParams } from './interfaces/create-order.interface';
import { CalculationParams } from './interfaces/calculation-params.interface';
import { ValidateValueBody } from './interfaces/validate-value-body.interface';
import { StartDualDeltaNeutralParams } from './interfaces/start-delta-neutral-params.interface';
import { PairRules } from './interfaces/pair-rules.interface';
import { OrderResult } from './interfaces/order-result.interface';
import { HedgePositionState } from './interfaces/hedge-position-state.interface';
import { HedgePlan } from './interfaces/hedge-plan.interface';
import { HedgeLegState } from './interfaces/hedge-leg-state.interface';
import { HedgeLegPlan } from './interfaces/hedge-leg-plan.interface';
import { AdaptiveOrderSetting } from './interfaces/adaptive-order-setting.interface';

@Injectable()
export class BinanceService implements OnModuleInit {
    private readonly logger = new Logger(BinanceService.name);
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly apiSecret: string;
    private serverTimeOffset = 0;
    private activeHedgingPositions = new Map<string, HedgePositionState>();
    private pairPrecisions = new Map<string, PairRules>();
    private listenKey: string;
    private listenKeyInterval: NodeJS.Timeout;
    private readonly TAKER_FEE_RATE = 0.0004;
    private zoneCooldowns = new Set<string>();
    private executingPositions = new Set<string>();
    private simulatedOrders = new Map<number, OrderResult>();
    private simulatedPositions = new Map<string, { positionAmt: string, entryPrice: string }>();
    private readonly ZONE_ENTRY_COOLDOWN_MS = 10 * 60 * 1000; 
    private zoneEntryTimers = new Map<string, NodeJS.Timeout>();
    private deltaNeutralInterval: NodeJS.Timeout;
    private deltaThreshold: number;
    

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly binanceWebsocketService: BinanceFuturesWebsocketService,
    ) {
        this.baseUrl = this.configService.get<string>('BINANCE_BASE_URL', 'https://fapi.binance.com');
        this.apiKey = this.configService.get<string>('BINANCE_API_KEY')!;
        this.apiSecret = this.configService.get<string>('BINANCE_SECRET_KEY')!;
    }

    async onModuleInit() {
        this.logger.log('BinanceService Initializing...');
        await this.syncServerTime();
        await this.fetchExchangeInfo();  
        await this.startUserStream();
        await this.restoreStateFromSource();
        const interval = parseInt(this.configService.get<string>('DELTA_NEUTRAL_CHECK_INTERVAL_MS', '15000'));
        this.deltaThreshold = parseFloat(this.configService.get<string>('DELTA_NEUTRAL_THRESHOLD_PERCENT', '0.01'));
        this.deltaNeutralInterval = setInterval(() => this.deltaNeutralWorkerLoop(), interval);
        this.logger.log(`Delta-Neutral hedging worker started with an interval of ${interval / 1000} seconds.`);
        this.logger.log('BinanceService Initialized Successfully.');
    }

    private async makeRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT',
        params: Record<string, any> = {},
    ): Promise<T> {
        const timestamp = Date.now() + this.serverTimeOffset;
        
        const stringParams: Record<string, string> = {};
        for (const key in params) {
            stringParams[key] = String(params[key]);
        }
        
        const query = { ...stringParams, timestamp: String(timestamp) };
        const queryString = new URLSearchParams(query).toString();
        const signature = this.createSignature(queryString);

        const url = `${this.baseUrl}${endpoint}`;

        const config = {
            headers: { 'X-MBX-APIKEY': this.apiKey },
        };

        try {
            let obs: Observable<AxiosResponse<T>>; // Явно типизируем obs для ясности
            if (method === 'POST' || method === 'PUT') {
                const fullUrl = `${url}?${queryString}&signature=${signature}`;
                obs = this.httpService[method.toLowerCase()]<T>(fullUrl, null, config);
            } else { // GET
                const fullUrl = `${url}?${queryString}&signature=${signature}`;
                obs = this.httpService.get<T>(fullUrl, config);
            }
            
            // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
            // Мы явно приводим тип, чтобы TypeScript знал, что у `response` есть свойство `.data`
            const response = await firstValueFrom(obs); 
            
            return response.data;

        } catch (error) {
            this.logger.error(`API Request Failed: ${method} ${url}`, error.response?.data || error.message);
            const axiosError = error as any; // Приведение к any для доступа к response
            throw new HttpException(
                axiosError.response?.data, 
                axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    private async getLastPrice(symbol: string): Promise<number> {
        try {
            const response = await this.makeRequest<{ price: string }>(
                '/fapi/v1/ticker/price', // 1. Эндпоинт
                'GET',                   // 2. Метод
                { symbol },
            );
            return parseFloat(response.price);
        } catch (error) {
            this.logger.error(`Could not fetch last price for ${symbol}`, error);
            throw new HttpException(`Failed to fetch last price for ${symbol}`, HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    private _calculateSingleLegPlan(
        tradingPair: string,
        valueForLeg: number, 
        absoluteRange: { lower: string; upper: string },
        entryPrice: number,
        customBaseHedgeAmount?: number,
        customLeverage?: number
    ): HedgeLegPlan { 
        this.logger.log(`[Leg Calc] Расчет для ${tradingPair}. Стоимость: ${valueForLeg.toFixed(2)}, Цена входа: ${entryPrice}`);

        const absoluteLowerPrice = parseFloat(absoluteRange.lower);
        const absoluteUpperPrice = parseFloat(absoluteRange.upper);

        const { quantityPrecision, pricePrecision } = this.pairPrecisions.get(tradingPair) || {
            quantityPrecision: 3,
            pricePrecision: 4
        };

        const rangeMidpoint = (absoluteUpperPrice + absoluteLowerPrice) / 2;
        if (rangeMidpoint <= 0 || absoluteLowerPrice >= rangeMidpoint) {
            throw new BadRequestException(`Неверный диапазон для ${tradingPair}: середина должна быть больше нуля и больше нижней границы.`);
        }
        const priceDropPercentage = (rangeMidpoint - absoluteLowerPrice) / rangeMidpoint;

        const hedgeRangeLower = entryPrice * (1 - priceDropPercentage);
        const hedgeRangeUpper = entryPrice * (1 + priceDropPercentage);

        let leverage = customLeverage && Number(customLeverage) > 0
            ? Number(customLeverage)
            : Math.ceil(1 / priceDropPercentage);

        let baseHedgeAmount = customBaseHedgeAmount && Number(customBaseHedgeAmount) > 0
            ? parseFloat(customBaseHedgeAmount as any)
            : (valueForLeg / entryPrice) * 0.20;

        const zoneWeights = [5, 10, 20, 40, 80];
        const hedgePartCount = 5;
        const priceStep = (entryPrice - hedgeRangeLower) / hedgePartCount;

        const tempZones: { price: number; weight: number; zone: number }[] = [];
        for (let i = 0; i < hedgePartCount; i++) {
            const zonePrice = entryPrice - (priceStep * (i + 1));
            tempZones.push({ price: zonePrice, weight: zoneWeights[i], zone: i + 1 });
        }
        const zone5Price = tempZones[4].price;

        const targetPnl = valueForLeg * 0.20;
        this.logger.log(`[Leg Calc - ${tradingPair}] Целевая PnL установлена в ${targetPnl.toFixed(2)} USDT.`);

        const baseHedgePnl = (entryPrice - zone5Price) * baseHedgeAmount;
        let requiredPnlFromZones = targetPnl - baseHedgePnl;
        if (requiredPnlFromZones < 0) {
            requiredPnlFromZones = 0;
        }

        const weightsForProfitDistribution = zoneWeights.slice(0, 4);
        const totalWeight = weightsForProfitDistribution.reduce((sum, w) => sum + w, 0);

        const calculatedZones: { zone: number, entryPrice: number, quantity: number }[] = [];
        let previousZoneQuantity = 0;

        for (let i = 0; i < hedgePartCount; i++) {
            const zoneInfo = tempZones[i];
            let quantity = 0;

            if (i < 4) {
                if (requiredPnlFromZones > 0 && totalWeight > 0) {
                    const pnlForThisZone = requiredPnlFromZones * (zoneInfo.weight / totalWeight);
                    const priceDifference = zoneInfo.price - zone5Price;

                    if (priceDifference > 0) {
                        quantity = pnlForThisZone / priceDifference;
                    }
                }
            } else {
                const weightRatio = zoneInfo.weight / tempZones[i - 1].weight;
                quantity = previousZoneQuantity * weightRatio;
            }

            calculatedZones.push({
                zone: zoneInfo.zone,
                entryPrice: zoneInfo.price,
                quantity: quantity,
            });
            previousZoneQuantity = quantity;
        }

        const roundedBaseHedgeAmount = parseFloat(baseHedgeAmount.toFixed(quantityPrecision));
        const roundedZones = calculatedZones.map(zone => ({
            ...zone,
            entryPrice: parseFloat(zone.entryPrice.toFixed(pricePrecision)),
            quantity: parseFloat(zone.quantity.toFixed(quantityPrecision)),
        }));

        return {
            tradingPair: tradingPair,
            leverage,
            range: { lower: hedgeRangeLower, upper: hedgeRangeUpper },
            baseHedgeAmount: roundedBaseHedgeAmount,
            targetPnl: targetPnl,
            zones: roundedZones,
        };
    }

    private async getPositionRisk(symbol: string, positionState?: HedgePositionState): Promise<any[]> {
        if (positionState && positionState.isSimulation) {
            this.logger.warn(`[SIMULATION] Returning faked position risk for ${symbol}`);

            const markPrice = await this.getLastPrice(symbol);
            
            // Ищем нужную "ногу" по символу
            const targetLeg = positionState.legs.find(leg => leg.tradingPair === symbol);
            
            // Получаем данные из "ноги", если она найдена, или используем данные верхнего уровня для старых стратегий
            const entryPrice = targetLeg ? targetLeg.lastAveragePrice : (positionState.lastAveragePrice || 0);
            const positionAmount = targetLeg ? targetLeg.currentHedgeAmount : (positionState.currentHedgeAmount || 0);
            
            const unrealizedPnl = (entryPrice - markPrice) * positionAmount;

            return [{
                symbol: symbol,
                positionAmt: String(-positionAmount), // Теперь здесь будет правильное значение
                entryPrice: String(entryPrice),
                markPrice: String(markPrice),
                unRealizedProfit: String(unrealizedPnl),
            }];
        }
        return this.makeRequest('/fapi/v2/positionRisk', 'GET', { symbol });
    }

    private async startUserStream(): Promise<void> {
        try {
            this.logger.log('Starting user data stream by obtaining listenKey...');
            const { listenKey } = await this.makeRequest<{ listenKey: string }>('/fapi/v1/listenKey', 'POST');
            this.listenKey = listenKey;
            this.logger.log('Listen key obtained. Connecting to user data WebSocket.');

            // Передаем ключ в веб-сокет сервис для подключения
            this.binanceWebsocketService.connectToUserStream(this.listenKey);

            // Очищаем старый интервал, если он был
            if (this.listenKeyInterval) {
                clearInterval(this.listenKeyInterval);
            }

            // Устанавливаем периодическое обновление ключа (каждые 30 минут)
            this.listenKeyInterval = setInterval(() => this.keepAliveListenKey(), 30 * 60 * 1000);
            
        } catch (error) {
            this.logger.error('Fatal error: Failed to start user stream. Order updates will not be received.', error);
        }
    }

    private async keepAliveListenKey(): Promise<void> {
        if (!this.listenKey) {
            this.logger.error('Cannot keep alive: listenKey is missing.');
            return;
        }
        try {
            await this.makeRequest('/fapi/v1/listenKey', 'PUT', { listenKey: this.listenKey });
            this.logger.log('Successfully kept listenKey alive.');
        } catch (error) {
            this.logger.error('Failed to keep listenKey alive. Attempting to restart the stream...', error);
            // Если ключ "умер", единственный способ - получить новый.
            await this.startUserStream();
        }
    }
    
    private async fetchExchangeInfo() {
        this.logger.log('Fetching exchange information for precision and order rules...');
        try {
            const endpoint = '/fapi/v1/exchangeInfo';
            const url = `${this.baseUrl}${endpoint}`;
            const response = await firstValueFrom(this.httpService.get(url));
            const symbols = response.data.symbols;

            symbols.forEach((symbolInfo: any) => {
                if (symbolInfo.status === 'TRADING') {
                    const lotSizeFilter = symbolInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
                    const minNotionalFilter = symbolInfo.filters.find((f: any) => f.filterType === 'MIN_NOTIONAL');

                    this.pairPrecisions.set(symbolInfo.symbol, {
                        quantityPrecision: symbolInfo.quantityPrecision,
                        pricePrecision: symbolInfo.pricePrecision,
                        minQty: lotSizeFilter ? parseFloat(lotSizeFilter.minQty) : 0,
                        minNotional: minNotionalFilter ? parseFloat(minNotionalFilter.minNotional) : 0,
                    });
                }
            });
            this.logger.log(`Successfully loaded rules for ${this.pairPrecisions.size} trading pairs.`);
        } catch (error) {
            this.logger.error('Failed to fetch exchange information. Order validation might fail.', error.message);
        }
    }

    public getTradableSymbols(): string[] {
        if (this.pairPrecisions.size === 0) {
            this.logger.warn('Pair precisions map is empty. Returning an empty array of symbols.');
            return [];
        }
        this.logger.log(`Returning ${this.pairPrecisions.size} tradable symbols.`);
        return Array.from(this.pairPrecisions.keys());
    }
    
    private subscribeToPrice(tradingPair: string) {
        this.binanceWebsocketService.subscribeToMarkPrice(tradingPair).subscribe({
            next: (priceDataString) => {
                try {
                    const rawMessage = JSON.parse(priceDataString);

                    // Сначала определяем, где находится полезная информация (в 'data' или в корне объекта)
                    const priceData = rawMessage.data ? rawMessage.data : rawMessage;

                    // Теперь мы можем уверенно извлечь цену, так как 'priceData' всегда будет нужным объектом
                    if (priceData && priceData.p) {
                        this.handlePriceUpdate(tradingPair, parseFloat(priceData.p));
                    } else {
                        // Добавим лог на случай, если придет что-то совсем неожиданное
                        this.logger.debug(`Received price update in unknown format for ${tradingPair}: ${priceDataString}`);
                    }
                } catch (e) {
                    this.logger.error(`Failed to parse price update for ${tradingPair}`, e);
                }
            },
            error: (err) => this.logger.error(`Error in ${tradingPair} price subscription`, err),
        });
    }

    private handlePriceUpdate(tradingPair: string, currentPrice: number) {
        this.activeHedgingPositions.forEach((positionState, positionId) => {
            // Проверяем, что позиция активна
            if (!positionState.isActive && !positionState.isSimulation) return;

            // Находим "ногу", которой принадлежит этот tradingPair
            const targetLeg = positionState.legs.find(leg => leg.tradingPair === tradingPair);

            // Если нашли, запускаем проверку зон именно для этой "ноги"
            if (targetLeg) {
                this.checkHedgeZones(positionId, positionState, targetLeg, currentPrice);
            }
        });
    }

    public async calculateHedgePlan(params: CalculationParams): Promise<HedgePlan> {
        this.logger.log(`Получен запрос на расчет плана. Стратегия: ${params.strategyType}, Пары: ${params.legs.map(l => l.binanceSymbol).join(', ')}`);

        const totalValueNum = parseFloat(params.totalValue);
        if (isNaN(totalValueNum) || totalValueNum <= 0) {
            throw new BadRequestException('Некорректное значение totalValue.');
        }

        const legPlans: HedgeLegPlan[] = [];

        // Асинхронно получаем текущие цены для всех "ног"
        const pricePromises = params.legs.map(leg => this.getLastPrice(leg.binanceSymbol));
        const currentPrices = await Promise.all(pricePromises);

        // Определяем стоимость, приходящуюся на каждую "ногу"
        const valuePerLeg = totalValueNum / params.legs.length;

        // Итерируемся и считаем план для каждой "ноги"
        for (let i = 0; i < params.legs.length; i++) {
            const legParams = params.legs[i];
            const currentPrice = currentPrices[i];

            const singleLegPlan = this._calculateSingleLegPlan(
                legParams.binanceSymbol,
                valuePerLeg,
                legParams.range,
                currentPrice
            );
            legPlans.push(singleLegPlan);
        }

        // Собираем итоговый HedgePlan
        return {
            strategyType: params.strategyType,
            totalValue: totalValueNum,
            pairName: params.pairName,
            legs: legPlans,
        };
    }
    private async queryOrder(symbol: string, orderId: number, isSimulation: boolean = false): Promise<OrderResult> {
        if (isSimulation) {
            if (this.simulatedOrders.has(orderId)) {
                this.logger.warn(`[SIMULATION] Returning faked order status for orderId: ${orderId}`);
                return this.simulatedOrders.get(orderId)!;
            }
            throw new Error(`Simulated order ${orderId} not found.`);
        }

        this.logger.log(`Querying REAL order status for orderId: ${orderId}`);
        return this.makeRequest<OrderResult>('/fapi/v1/order', 'GET', { symbol, orderId });
    }

    async startHedgingSimulation(positionId: string, plan: HedgePlan) {
        this.logger.warn(`[SIMULATION] Starting hedge simulation for position: ${positionId}`);
        if (!plan || !plan.legs || plan.legs.length === 0) {
            throw new BadRequestException('Hedge plan with legs is required for simulation.');
        }

        const allLegsState: HedgeLegState[] = [];
        const historyLog: string[] = [`[${new Date().toISOString()}] SIMULATION Started with ${plan.legs.length} leg(s).`];

        for (const legPlan of plan.legs) {
            const { tradingPair, leverage, baseHedgeAmount, zones } = legPlan;
            const precision = this.pairPrecisions.get(tradingPair)?.quantityPrecision ?? 3;
            const quantityFormatted = Number(baseHedgeAmount).toFixed(precision);

            let executionPrice = 0;
            let executedQty = 0;
            let initialFee = 0;

            try {
                await this.changeLeverage(tradingPair, leverage, true);
                const initialResponse = await this.placeOrder({
                    symbol: tradingPair, side: 'SELL', type: 'MARKET', quantity: quantityFormatted
                }, true);
                const verifiedOrderResult = await this.queryOrder(tradingPair, initialResponse.orderId, true);

                if (verifiedOrderResult && parseFloat(verifiedOrderResult.executedQty) > 0) {
                    executionPrice = parseFloat(verifiedOrderResult.avgPrice);
                    executedQty = parseFloat(verifiedOrderResult.executedQty);
                    initialFee = executionPrice * executedQty * this.TAKER_FEE_RATE;
                    historyLog.push(` -> Leg ${tradingPair}: Base hedge placed: ${executedQty.toFixed(precision)} at ≈${executionPrice}. Fee: ≈${initialFee.toFixed(4)} USD`);
                }
            } catch (error) {
                this.logger.error(`[SIMULATION] Error during initial hedge placement for ${tradingPair}`, error);
            }

            this.subscribeToPrice(tradingPair);

            const legOrderSettings: AdaptiveOrderSetting[] = zones.map(z => ({
                zone: z.zone, orderPrice: z.entryPrice, amount: z.quantity,
                originalAmount: z.quantity, amountToFill: z.quantity, amountFilledInZone: 0,
                isProcessed: false, timesEntered: 0,
            }));

            allLegsState.push({
                tradingPair: tradingPair,
                leverage: leverage,
                currentHedgeAmount: executedQty,
                lastAveragePrice: executedQty > 0 ? executionPrice : 0,
                totalRealizedPnl: 0,
                totalFeesPaid: initialFee,
                ordersSettings: legOrderSettings,
            });
        }

        // ИСПРАВЛЕНИЕ: Создаем состояние с обязательным полем legs
        const newState: HedgePositionState = {
            strategyType: plan.strategyType,
            pairName: plan.pairName,
            totalValue: plan.totalValue,
            isActive: true,
            history: historyLog,
            isSimulation: true,
            legs: allLegsState,
        };

        this.activeHedgingPositions.set(positionId, newState);

        await this.saveHedgeState(positionId, newState);
        this.logger.log(`[SIMULATION] Hedging for ${positionId} initialized successfully.`);
        return { message: `Simulation started for ${positionId}` };
    }

    async startHedgingProcess(
        positionId: string,
        pairName: string,       // e.g., "SOL/USDT" or "PYTH/JUP"
        totalValueStr: string,  // Общая стоимость для справки
        range: { lower: string; upper: string }, // Этот параметр теперь используется в основном для логов/справки
        planFromFrontend: HedgePlan
    ) {
        if (!planFromFrontend || !planFromFrontend.legs || planFromFrontend.legs.length === 0) {
            throw new BadRequestException('План хеджирования (HedgePlan) с "ногами" (legs) обязателен для запуска.');
        }

        this.logger.log(`[${positionId}] Запуск процесса хеджирования по стратегии ${planFromFrontend.strategyType} для пары ${pairName}`);

        const allLegsState: HedgeLegState[] = [];
        const historyLog: string[] = [`[${new Date().toISOString()}] Process started with ${planFromFrontend.legs.length} leg(s).`];

        // --- НАЧАЛО ЦИКЛА ПО "НОГАМ" ---
        for (const legPlan of planFromFrontend.legs) {
            const { tradingPair, leverage, baseHedgeAmount, zones } = legPlan;
            this.logger.log(`[${positionId}] Processing leg: ${tradingPair}`);

            const precision = this.pairPrecisions.get(tradingPair)?.quantityPrecision ?? 3;
            const quantityFormatted = Number(baseHedgeAmount).toFixed(precision);

            let executionPrice: number = 0;
            let executedQty: number = 0;
            let initialFee: number = 0;

            try {
                // 1. Устанавливаем плечо для данной "ноги"
                await this.changeLeverage(tradingPair, leverage);

                // 2. Размещаем базовый хедж-ордер для данной "ноги"
                const initialResponse = await this.placeOrder({
                    symbol: tradingPair,
                    side: 'SELL',
                    type: 'MARKET',
                    quantity: quantityFormatted
                });

                await new Promise(resolve => setTimeout(resolve, 500)); // Пауза для исполнения ордера

                // 3. Запрашиваем итоговый статус ордера
                const verifiedOrderResult = await this.queryOrder(tradingPair, initialResponse.orderId);

                if (verifiedOrderResult && parseFloat(verifiedOrderResult.executedQty) > 0) {
                    executionPrice = parseFloat(verifiedOrderResult.avgPrice);
                    executedQty = parseFloat(verifiedOrderResult.executedQty);
                    initialFee = executionPrice * executedQty * this.TAKER_FEE_RATE;
                    historyLog.push(` -> Leg ${tradingPair}: Base hedge placed: ${executedQty.toFixed(precision)} at ≈${executionPrice.toFixed(4)}. Fee: ≈${initialFee.toFixed(4)} USD`);
                } else {
                    this.logger.warn(`[${positionId}] Verified hedge order for ${tradingPair} was not filled. Initializing with 0 amount.`);
                    historyLog.push(` -> Leg ${tradingPair}: Base hedge FAILED to fill.`);
                }

            } catch (error) {
                this.logger.error(`[${positionId}] FAILED to place or verify base hedge for ${tradingPair}. Initializing with 0 amount.`, error);
                historyLog.push(` -> Leg ${tradingPair}: Base hedge FAILED with error.`);
            }

            // 4. Подписываемся на цену для данной "ноги"
            this.subscribeToPrice(tradingPair);

            // 5. Создаем "живое" состояние для данной "ноги"
            const legOrderSettings: AdaptiveOrderSetting[] = zones.map(z => ({
                zone: z.zone,
                orderPrice: z.entryPrice,
                amount: z.quantity,
                originalAmount: z.quantity,
                amountToFill: z.quantity,
                amountFilledInZone: 0,
                isProcessed: false,
                timesEntered: 0,
            }));

            const newLegState: HedgeLegState = {
                tradingPair: tradingPair,
                leverage: leverage,
                currentHedgeAmount: executedQty,
                lastAveragePrice: executedQty > 0 ? executionPrice : 0,
                totalRealizedPnl: 0,
                totalFeesPaid: initialFee,
                ordersSettings: legOrderSettings,
            };

            allLegsState.push(newLegState);
        }
        // --- КОНЕЦ ЦИКЛА ПО "НОГАМ" ---

        // 6. Создаем и сохраняем общее состояние позиции
        const newState: HedgePositionState = {
            strategyType: planFromFrontend.strategyType,
            pairName: pairName,
            totalValue: planFromFrontend.totalValue,
            isActive: true,
            history: historyLog,
            isSimulation: false,
            legs: allLegsState, 
        };

        this.activeHedgingPositions.set(positionId, newState);
        await this.saveHedgeState(positionId, newState);

        this.logger.log(`[${positionId}] Hedging process for ${pairName} initialized successfully.`);
    }

    public async validateValue(params: ValidateValueBody): Promise<void> {
       const { totalValue, legs } = params;
       const logPrefix = `[Validation]`;

       const valuePerLeg = totalValue / legs.length;
       for (const legInfo of legs) {
           const rules = this.pairPrecisions.get(legInfo.tradingPair);
           if (!rules) {
               throw new HttpException(`Trading rules for ${legInfo.tradingPair} not found.`, HttpStatus.INTERNAL_SERVER_ERROR);
           }
           const MIN_NOTIONAL_PRACTICAL = 5.5;
            if (valuePerLeg < MIN_NOTIONAL_PRACTICAL) {
                this.logger.error(`${logPrefix} Failed for ${legInfo.tradingPair}. Value per leg ($${valuePerLeg.toFixed(2)}) is below practical minimum ($${MIN_NOTIONAL_PRACTICAL}).`);
                throw new BadRequestException('The entered amount does not meet the minimum exchange requirements. Please increase the amount.');
            }
        }
        this.logger.log(`${logPrefix} Value $${totalValue} is valid for all legs.`);
    }

    public async startDeltaNeutralHedging(params: {
        positionId: string;
        pairName: string;
        tradingPair: string;
        totalValue: number;
        range: { lower: number; upper: number };
        leverage: number;
        isSimulation?: boolean;
    }) {
        const { positionId, pairName, tradingPair, totalValue, leverage, isSimulation = false } = params;
        const logPrefix = `[Delta-Neutral][${positionId}]${isSimulation ? '[SIM]' : ''}`;

        this.logger.log(`${logPrefix} Received request to start DELTA-NEUTRAL hedging.`);
        
        if (this.activeHedgingPositions.has(positionId)) {
            throw new BadRequestException(`A hedging position with ID ${positionId} already exists.`);
        }

        await this.validateValue({
           totalValue: totalValue,
           legs: [{ tradingPair: tradingPair }]
        });

        const legState: HedgeLegState = {
            tradingPair: tradingPair,
            currentHedgeAmount: 0,
            lastAveragePrice: 0,
            totalRealizedPnl: 0,
            totalFeesPaid: 0,
            leverage: leverage,
            ordersSettings: [], 
        };

        const newState: HedgePositionState = {
            strategyType: 'DELTA_NEUTRAL',
            pairName: pairName,
            totalValue: totalValue,
            isActive: true,
            history: [`[${new Date().toISOString()}] DELTA-NEUTRAL hedging process started.`],
            isSimulation: isSimulation,
            legs: [legState], // Помещаем единственную ногу в массив
        };

        try {
            await this.changeLeverage(tradingPair, leverage, isSimulation);
        } catch (error) {
            this.logger.error(`${logPrefix} FAILED to set leverage. Aborting start.`);
            throw new HttpException('Failed to set leverage on Binance.', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        this.activeHedgingPositions.set(positionId, newState);
        this.subscribeToPrice(tradingPair);
        await this.checkDeltaNeutralHedge(positionId, newState);
        this.logger.log(`${logPrefix} Delta-neutral hedging initialized successfully.`);
        return { message: `Delta-neutral hedging started for ${positionId}` };
    }

    public async startDualDeltaNeutralHedging(params: StartDualDeltaNeutralParams) {
        const { positionId, pairName, totalValue, legs, isSimulation = false } = params;
        const logPrefix = `[Dual-Delta-Neutral][${positionId}]${isSimulation ? '[SIM]' : ''}`;

        this.logger.log(`${logPrefix} Received request to start DUAL delta-neutral hedging.`);
        if (!isSimulation && this.activeHedgingPositions.has(positionId)) {
            throw new BadRequestException(`A hedging position with ID ${positionId} already exists.`);
        }

        await this.validateValue({ totalValue, legs: legs.map(l => ({ tradingPair: l.tradingPair })) });

        const valuePerLeg = totalValue / legs.length;
        for (const legInfo of legs) {
            const rules = this.pairPrecisions.get(legInfo.tradingPair);
            if (!rules) {
                // Эта ошибка не должна возникать, если сервис инициализирован правильно, но это хорошая защита
                throw new HttpException(`Trading rules for ${legInfo.tradingPair} not found. Cannot validate.`, HttpStatus.INTERNAL_SERVER_ERROR);
            }
            // Проверяем, что стоимость для каждой "ноги" больше, чем минимальная требуемая стоимость ордера
            if (valuePerLeg < rules.minNotional) {
                this.logger.error(`${logPrefix} Validation Failed for ${legInfo.tradingPair}. Value per leg ($${valuePerLeg.toFixed(2)}) is below minNotional ($${rules.minNotional}).`);
                // Возвращаем ту же ошибку, что и на фронтенде
                throw new BadRequestException('The entered amount does not meet the minimum exchange requirements. Please increase the amount.');
            }
        }
        this.logger.log(`${logPrefix} Initial value validation passed.`);

        const allLegsState: HedgeLegState[] = [];
        for (const legInfo of legs) {
            await this.changeLeverage(legInfo.tradingPair, legInfo.leverage, isSimulation);
            
            allLegsState.push({
                tradingPair: legInfo.tradingPair,
                currentHedgeAmount: 0,
                lastAveragePrice: 0,
                totalRealizedPnl: 0,
                totalFeesPaid: 0,
                leverage: legInfo.leverage,
                ordersSettings: [], 
            });
            this.subscribeToPrice(legInfo.tradingPair); 
        }

        const newState: HedgePositionState = {
            strategyType: 'DELTA_NEUTRAL', // Используем существующий тип
            pairName: pairName,
            totalValue: totalValue,
            isActive: true,
            history: [`[${new Date().toISOString()}] DUAL DELTA-NEUTRAL hedging process started.`],
            isSimulation: isSimulation,
            legs: allLegsState, // <-- Сохраняем массив с двумя ногами
        };

        this.activeHedgingPositions.set(positionId, newState);
        // Первый запуск проверки, чтобы сразу открыть начальные хедж-позиции
        await this.checkDeltaNeutralHedge(positionId, newState); 
        this.logger.log(`${logPrefix} Dual delta-neutral hedging initialized successfully.`);
        return { message: `Dual delta-neutral hedging started for ${positionId}` };
    }

    private async restoreStateFromSource() {
        this.logger.log('Attempting to restore active hedge states from liquidity-bot...');
        try {
            const liquidityBotHost = this.configService.get<string>('LIQUIDITY_BOT_HOST', 'localhost:3003');
            const response = await axios.get(`http://${liquidityBotHost}/liquidity/internal/active-for-hedging`);
            
            const positionsToRestore: any[] = response.data;
            this.logger.log(`Found ${positionsToRestore.length} positions to restore.`);

            for (const pos of positionsToRestore) {

                if (pos.hedgeExchange !== 'binance') {
                    continue; 
                }
                
                if (this.activeHedgingPositions.has(pos.positionId)) continue;

                const restoredState: HedgePositionState = pos.hedgePlan; 
                
                // Если есть поле legs - это новая структура
                if (restoredState && Array.isArray(restoredState.legs) && restoredState.legs.length > 0) {
                    this.logger.log(`[${pos.positionId}] Restoring state with LEG structure.`);
                    this.activeHedgingPositions.set(pos.positionId, restoredState);
                    restoredState.legs.forEach(leg => this.subscribeToPrice(leg.tradingPair));

                // Иначе - это старая структура
                } else if (restoredState) {
                    this.logger.log(`[${pos.positionId}] Restoring LEGACY state.`);
                    this.activeHedgingPositions.set(pos.positionId, restoredState);
                    
                    // ИСПРАВЛЕНИЕ: Проверяем, что tradingPair существует
                    if (restoredState.tradingPair) {
                        this.subscribeToPrice(restoredState.tradingPair);
                    }
                } else {
                    this.logger.error(`[${pos.positionId}] No hedge plan found for this position. Cannot restore.`);
                }
            }
        } catch (error) {
            this.logger.error('Failed to restore hedge states from liquidity-bot.', error.message);
        }
    }

    private async checkHedgeZones(
        positionId: string,
        positionState: HedgePositionState,  
        legState: HedgeLegState,            
        currentPrice: number
    ) {
        if (this.executingPositions.has(positionId)) {
            return;
        }

        const logPrefix = `[${positionId}][${legState.tradingPair}]`;

        // --- Логика откупа (Take-Profit / Stop-Loss) ---
        const lastActiveZone = [...legState.ordersSettings].reverse().find(s => s.isProcessed);

        if (lastActiveZone?.isProcessed) {
            try {
                this.executingPositions.add(positionId);

                const lowWaterMark = lastActiveZone.lowWaterMark;
                const lastAveragePrice = legState.lastAveragePrice; // Используем среднюю цену "ноги"

                if (lowWaterMark !== undefined && lastAveragePrice > lowWaterMark) {
                    const takeProfitTargetPrice = lowWaterMark + (lastAveragePrice - lowWaterMark) * 0.1;
                    if (currentPrice >= takeProfitTargetPrice) {
                        this.logger.warn(`${logPrefix} Take-Profit on rebound. Target: >=${takeProfitTargetPrice.toFixed(4)}. Current: ${currentPrice}.`);
                        await this.executeHedgeAction(positionId, positionState, legState, 'BUY', lastActiveZone, currentPrice);
                        return; // Выходим после действия
                    }
                }

                if (currentPrice >= lastAveragePrice) {
                    this.logger.error(`${logPrefix} !!! PARTIAL STOP-LOSS AT ENTRY !!! Target: >=${lastAveragePrice.toFixed(4)}. Current: ${currentPrice}.`);
                    await this.executeHedgeAction(positionId, positionState, legState, 'BUY', lastActiveZone, currentPrice);
                    return; // Выходим после действия
                }
            } finally {
                this.executingPositions.delete(positionId);
            }
        }

        // --- Логика входа в новые зоны (Продажа) ---
        try {
            this.executingPositions.add(positionId);
            for (const setting of legState.ordersSettings) {
                const timerKey = `${positionId}-${legState.tradingPair}-${setting.zone}`; // Уникальный ключ

                // Цена вошла в зону продажи
                if (!setting.isProcessed && setting.orderPrice && currentPrice <= setting.orderPrice) {
                    if (!this.zoneEntryTimers.has(timerKey)) {
                        this.logger.log(`${logPrefix} Price entered Zone ${setting.zone}. Starting timer...`);
                        const timer = setTimeout(() => {
                            this.logger.warn(`${logPrefix} Timer for Zone ${setting.zone} finished. Executing SELL.`);
                            this.executeHedgeAction(positionId, positionState, legState, 'SELL', setting, currentPrice);
                            this.zoneEntryTimers.delete(timerKey);
                        }, this.ZONE_ENTRY_COOLDOWN_MS);
                        this.zoneEntryTimers.set(timerKey, timer);
                    }
                } else { // Цена вышла из зоны (поднялась выше)
                    if (this.zoneEntryTimers.has(timerKey)) {
                        this.logger.log(`${logPrefix} Price left Zone ${setting.zone}. Cancelling timer.`);
                        clearTimeout(this.zoneEntryTimers.get(timerKey)!);
                        this.zoneEntryTimers.delete(timerKey);
                    }
                }
            }
        } finally {
            this.executingPositions.delete(positionId);
        }
    }

    private async deltaNeutralWorkerLoop() {
        const promises: Promise<void>[] = [];
        this.activeHedgingPositions.forEach((positionState, positionId) => {
            // Запускаем проверку только для активных позиций с типом DELTA_NEUTRAL
            if (positionState.isActive && positionState.strategyType === 'DELTA_NEUTRAL') {
                promises.push(this.checkDeltaNeutralHedge(positionId, positionState));
            }
        });

        // Выполняем все проверки параллельно
        if (promises.length > 0) {
            this.logger.log(`[Delta-Neutral-Worker] Checking ${promises.length} positions...`);
            await Promise.all(promises);
        }
    }

    private async checkDeltaNeutralHedge(positionId: string, positionState: HedgePositionState) {
        if (!positionState.legs || positionState.legs.length === 0) {
            this.logger.error(`[Delta-Neutral][${positionId}] State has no legs. Aborting.`);
            return;
        }

        if (this.executingPositions.has(positionId)) return;

        try {
            this.executingPositions.add(positionId);
            const logPrefix = `[Delta-Neutral][${positionId}]`;

            // 1. Получаем реальный состав LP-позиции из rebalancer-сервиса
            let lpBaseAmount: number;
            let lpQuoteAmount: number;
            try {
                const rebalancerHost = this.configService.get<string>('REBALANCER_HOST');
                const response = await axios.get(`http://${rebalancerHost}/rebalance/position/${positionId}/assets`);
                // Цель хеджа - это точное количество каждого токена в LP
                lpBaseAmount = parseFloat(response.data.baseAmount);
                lpQuoteAmount = parseFloat(response.data.quoteAmount);
            } catch (error) {
                this.logger.error(`${logPrefix} FAILED to get target delta from rebalancer-service: ${error.message}`);
                return; // Выходим, если не можем получить данные
            }

            // 2. Итерируемся по каждой "ноге" и корректируем ее
            for (const leg of positionState.legs) {
                // Предполагаем, что первая нога в массиве - это базовый актив, вторая - квотируемый.
                // Это соглашение должно соблюдаться при вызове startDualDeltaNeutralHedging.
                const isBaseLeg = leg === positionState.legs[0];
                const targetHedgeSize = isBaseLeg ? lpBaseAmount : lpQuoteAmount;
                const positionRiskData = await this.getPositionRisk(leg.tradingPair, positionState.isSimulation ? positionState : undefined);
                const currentPositionOnBinance = positionRiskData.find(p => p.symbol === leg.tradingPair);
                const currentHedgeSize = currentPositionOnBinance ? Math.abs(parseFloat(currentPositionOnBinance.positionAmt)) : 0;
                
                const adjustmentAmount = targetHedgeSize - currentHedgeSize;
                
                // Порог для предотвращения слишком частых сделок (0.5% от цели)
                const threshold = targetHedgeSize * this.deltaThreshold; 
                if (Math.abs(adjustmentAmount) < threshold) continue; // Переходим к следующей ноге, если разница мала

                const rules = this.pairPrecisions.get(leg.tradingPair);
                if (!rules || Math.abs(adjustmentAmount) < rules.minQty) continue;

                const currentPrice = await this.getLastPrice(leg.tradingPair);
                if ((Math.abs(adjustmentAmount) * currentPrice) < rules.minNotional) continue;

                this.logger.warn(`${logPrefix}[${leg.tradingPair}] Adjustment needed. Target: ${targetHedgeSize.toFixed(4)}, Current: ${currentHedgeSize.toFixed(4)}, Diff: ${adjustmentAmount.toFixed(4)}`);

                if (adjustmentAmount > 0) { // Нужно увеличить шорт
                    await this.executeHedgeAdjustment(positionId, positionState, leg, 'SELL', adjustmentAmount);
                } else { // Нужно уменьшить шорт
                    await this.executeHedgeAdjustment(positionId, positionState, leg, 'BUY', Math.abs(adjustmentAmount));
                }
            }
        } catch (error) {
            this.logger.error(`[Delta-Neutral][${positionId}] Unhandled error in checkDeltaNeutralHedge:`, error);
        } finally {
            this.executingPositions.delete(positionId);
        }
    }

    private async executeHedgeAdjustment(
        positionId: string,
        positionState: HedgePositionState, // Общее состояние для истории
        leg: HedgeLegState,                // Конкретная "нога" для всех операций
        side: 'BUY' | 'SELL',
        quantity: number
    ) {
        const logPrefix = `[Delta-Neutral][${positionId}]`;
        const precision = this.pairPrecisions.get(leg.tradingPair)?.quantityPrecision ?? 3;
        const quantityFormatted = quantity.toFixed(precision);

        this.logger.log(`${logPrefix} Executing adjustment: ${side} ${quantityFormatted} ${leg.tradingPair}`);

        try {
            const orderResponse = await this.placeOrder({
                symbol: leg.tradingPair, // <-- Используем поле из "ноги"
                side,
                type: 'MARKET',
                quantity: quantityFormatted
            }, positionState.isSimulation);

            await new Promise(resolve => setTimeout(resolve, 500));
            const verifiedOrder = await this.queryOrder(leg.tradingPair, orderResponse.orderId, positionState.isSimulation);

            if (!verifiedOrder || parseFloat(verifiedOrder.executedQty) === 0) {
                this.logger.error(`${logPrefix} FAILED to verify adjustment execution. Aborting state update.`);
                return;
            }

            const actualExecutionPrice = parseFloat(verifiedOrder.avgPrice);
            const actualExecutedQty = parseFloat(verifiedOrder.executedQty);
            const tradeValue = actualExecutionPrice * actualExecutedQty;
            const commission = tradeValue * this.TAKER_FEE_RATE;

            // Обновляем состояние "ноги"
            leg.totalFeesPaid += commission;
            const logMessage = `ADJUSTMENT: ${side} ${actualExecutedQty.toFixed(precision)} at ${actualExecutionPrice}. Fee: ≈${commission.toFixed(4)}. Total fees: ${leg.totalFeesPaid.toFixed(4)}`;
            positionState.history.push(`[${new Date().toISOString()}] ${logMessage}`);

            if (side === 'SELL') {
                const oldTotalValue = leg.lastAveragePrice * leg.currentHedgeAmount;
                const newTotalValue = oldTotalValue + tradeValue;
                leg.currentHedgeAmount += actualExecutedQty;
                leg.lastAveragePrice = newTotalValue / leg.currentHedgeAmount;
            } else { // BUY
                const realizedPnlForTrade = (leg.lastAveragePrice - actualExecutionPrice) * actualExecutedQty;
                leg.totalRealizedPnl += realizedPnlForTrade;
                leg.currentHedgeAmount -= actualExecutedQty;
                const pnlMessage = `Realized PnL for adjustment: ${realizedPnlForTrade.toFixed(4)}. Total realized PnL: ${leg.totalRealizedPnl.toFixed(4)}`;
                positionState.history.push(`[${new Date().toISOString()}] ${pnlMessage}`);
            }

            await this.saveHedgeState(positionId, positionState);
            this.logger.log(`${logPrefix} State updated. New hedge amount: ${leg.currentHedgeAmount.toFixed(4)}`);

        } catch (error) {
            this.logger.error(`${logPrefix} FAILED to execute adjustment order:`, error.response?.data || error.message);
        }
    }

    private async executeHedgeAction(
        positionId: string,
        positionState: HedgePositionState, // Общее состояние (для истории)
        legState: HedgeLegState,           // Состояние "ноги" (для расчетов)
        side: 'BUY' | 'SELL',
        setting: AdaptiveOrderSetting,
        triggerPrice: number
        ) {
        const isSim = positionState.isSimulation === true;
        const logPrefix = isSim ? `[SIMULATION][${positionId}][${legState.tradingPair}]` : `[${positionId}][${legState.tradingPair}]`;

        const precision = this.pairPrecisions.get(legState.tradingPair)?.quantityPrecision ?? 3;
        let quantityToTrade = 0;

        if (side === 'SELL') {
            // ... (логика расчета объема остается прежней)
            const originalAmount = setting.originalAmount;
            const SENSITIVITY_FACTOR = 2.0;
            let increaseFactor = 1.0;
            if (setting.orderPrice && legState.lastAveragePrice > 0 && setting.orderPrice < legState.lastAveragePrice) {
                const priceShift = legState.lastAveragePrice - setting.orderPrice;
                const priceShiftPercentage = priceShift / legState.lastAveragePrice;
                increaseFactor = 1 + (priceShiftPercentage * SENSITIVITY_FACTOR);
            }
            increaseFactor = Math.min(increaseFactor, 3.0);
            quantityToTrade = originalAmount * increaseFactor;
        } else { // BUY
            quantityToTrade = setting.amountFilledInZone;
        }

        if (quantityToTrade <= 0) return;
        const quantityFormatted = quantityToTrade.toFixed(precision);

        try {
            const orderResponse = await this.placeOrder({
                symbol: legState.tradingPair,
                side,
                type: 'MARKET',
                quantity: quantityFormatted
            }, isSim);

            await new Promise(resolve => setTimeout(resolve, 500));
            const verifiedOrder = await this.queryOrder(legState.tradingPair, orderResponse.orderId, isSim);

            if (!verifiedOrder || parseFloat(verifiedOrder.executedQty) === 0) {
                this.logger.error(`${logPrefix} FAILED to verify execution for order ${orderResponse.orderId}. Aborting state update.`);
                return;
            }

            const actualExecutionPrice = parseFloat(verifiedOrder.avgPrice);
            const actualExecutedQty = parseFloat(verifiedOrder.executedQty);
            this.logger.log(`${logPrefix} Verified Execution: ${side} ${actualExecutedQty} at ${actualExecutionPrice}`);

            const tradeValue = actualExecutionPrice * actualExecutedQty;
            const commission = tradeValue * this.TAKER_FEE_RATE;
            legState.totalFeesPaid = (legState.totalFeesPaid || 0) + commission; // Обновляем комиссию "ноги"

            const logMessage = `Leg ${legState.tradingPair}: ${side} ${actualExecutedQty} at ${actualExecutionPrice.toFixed(4)} (Zone ${setting.zone}). Fee: ≈${commission.toFixed(4)}.`;
            positionState.history.push(`[${new Date().toISOString()}] ${logMessage}`); // Добавляем в общую историю

            if (side === 'SELL') {
                const oldTotalValue = legState.lastAveragePrice * legState.currentHedgeAmount;
                const newTotalValue = oldTotalValue + tradeValue;
                legState.currentHedgeAmount += actualExecutedQty;
                legState.lastAveragePrice = newTotalValue / legState.currentHedgeAmount;
                setting.isProcessed = true;
                setting.amountFilledInZone += actualExecutedQty;
                setting.lowWaterMark = actualExecutionPrice;
                this.logger.log(`${logPrefix} SELL success. New leg amount: ${legState.currentHedgeAmount.toFixed(3)}, New leg avg price: ${legState.lastAveragePrice.toFixed(4)}`);
            } else { // BUY
                const entryPrice = legState.lastAveragePrice;
                if (entryPrice > 0) {
                    const realizedPnlForTrade = (entryPrice - actualExecutionPrice) * actualExecutedQty;
                    legState.totalRealizedPnl = (legState.totalRealizedPnl || 0) + realizedPnlForTrade;
                    
                    const pnlMessage = `Leg ${legState.tradingPair}: Realized PnL: ${realizedPnlForTrade.toFixed(4)}. Total leg PnL: ${legState.totalRealizedPnl.toFixed(4)}.`;
                    positionState.history.push(`[${new Date().toISOString()}] ${pnlMessage}`);
                    this.logger.log(`${logPrefix} ${pnlMessage}`);
                }
                legState.currentHedgeAmount -= actualExecutedQty;
                setting.amountFilledInZone -= actualExecutedQty;

                if (setting.amountFilledInZone <= (setting.originalAmount * 0.01)) {
                    setting.isProcessed = false;
                    setting.amountFilledInZone = 0;
                    setting.timesEntered += 1;
                    setting.lowWaterMark = undefined;
                    setting.amountToFill = setting.originalAmount;
                } else {
                    this.logger.warn(`${logPrefix} PARTIAL BUY FILL for Zone ${setting.zone}. Remaining to close: ${setting.amountFilledInZone.toFixed(precision)}. Zone remains active.`);
                }
            }
            await this.saveHedgeState(positionId, positionState);
        } catch (error) {
            this.logger.error(`${logPrefix} FAILED to place or verify ${side} order for zone ${setting.zone}:`, error.response?.data || error.message);
        }
    }

    async stopHedgingForPosition(positionId: string) {
        this.logger.log(`Received request to stop hedging for position: ${positionId}`);
        const positionState = this.activeHedgingPositions.get(positionId);

        if (!positionState) {
            throw new HttpException(`No active hedge found for positionId: ${positionId}`, HttpStatus.NOT_FOUND);
        }

        positionState.isActive = false; // Маркируем всю позицию как неактивную
        this.logger.log(`[${positionId}] Position marked as inactive.`);

        // Итерируемся по "ногам" и отписываемся от цен
        for (const leg of positionState.legs) {
            this.binanceWebsocketService.unsubscribeFromMarkPrice(leg.tradingPair);
            this.logger.log(`[${positionId}] Unsubscribed from price updates for ${leg.tradingPair}.`);
        }

        if (positionState.isSimulation) {
            this.logger.warn(`[SIMULATION] Closing simulated position ${positionId}.`);
            this.activeHedgingPositions.delete(positionId);
            await this.saveHedgeState(positionId, { ...positionState, legs: [] }); // Сохраняем пустое состояние
            return { message: `Hedging simulation successfully stopped for position ${positionId}` };
        }

        // Итерируемся по "ногам" и закрываем реальные позиции на Binance
        for (const leg of positionState.legs) {
            const positionRiskData = await this.getPositionRisk(leg.tradingPair);
            const currentPositionOnBinance = positionRiskData.find(p => p.symbol === leg.tradingPair);
            const amountToClose = currentPositionOnBinance ? Math.abs(parseFloat(currentPositionOnBinance.positionAmt)) : 0;

            this.logger.log(`[${positionId}] Real position size for ${leg.tradingPair} is ${amountToClose}. Proceeding to close.`);

            if (amountToClose > 0) {
                try {
                    const precision = this.pairPrecisions.get(leg.tradingPair)?.quantityPrecision ?? 3;
                    const quantityFormatted = amountToClose.toFixed(precision);
                    await this.placeOrder({
                        symbol: leg.tradingPair, side: 'BUY', type: 'MARKET', quantity: quantityFormatted
                    });
                    this.logger.log(`[${positionId}] Successfully placed closing BUY order for ${leg.tradingPair}.`);
                } catch (error) {
                    const errorMessage = error.response?.data?.msg || error.message;
                    this.logger.error(`[${positionId}] Failed to close position for ${leg.tradingPair}. Error: ${errorMessage}`, error.stack);
                    // Важно: не прерываемся, а пытаемся закрыть остальные "ноги"
                }
            }
        }

        this.activeHedgingPositions.delete(positionId);
        this.logger.log(`Hedging state for position ${positionId} has been cleared.`);
        await this.saveHedgeState(positionId, { ...positionState, legs: [] }); // Сохраняем пустое состояние
        
        return { message: `Hedging successfully stopped for position ${positionId}` };
    }

    public async prepareForRebalance(positionId: string): Promise<{ message: string }> {
        const positionState = this.activeHedgingPositions.get(positionId);
        if (!positionState) {
            // Это не ошибка, возможно, для этой LP-позиции просто нет хеджа
            this.logger.log(`[Prepare-Rebalance] No active hedge found for ${positionId}. No action taken.`);
            return { message: 'No active hedge found. No action taken.' };
        }

        // Ставим на паузу ТОЛЬКО дельта-нейтральные позиции
        if (positionState.strategyType === 'DELTA_NEUTRAL') {
            positionState.isActive = false;
            await this.saveHedgeState(positionId, positionState);
            this.logger.log(`[Prepare-Rebalance] Delta-neutral hedge for ${positionId} has been PAUSED.`);
            return { message: `Hedge for ${positionId} has been paused.` };
        }

        this.logger.log(`[Prepare-Rebalance] Position ${positionId} is a GRID strategy. No pause needed.`);
        return { message: 'Position is a GRID strategy. No action taken.' };
    }

    private calculateBaseHedgeAmount(totalValue: number, range: { lower: string, upper: string }): number {
          const rangeLower = parseFloat(range.lower);
          const rangeUpper = parseFloat(range.upper);
          const hedgeCoeff = 0.2;
          const initialHedgeMargin = totalValue * hedgeCoeff;

          const initialPrice = (rangeUpper + rangeLower) / 2;
          const priceDropPercentage = (initialPrice - rangeLower) / initialPrice;
          if (priceDropPercentage <= 0) return 0; // Защита от деления на ноль

          const leverage = Math.ceil(1 / priceDropPercentage);
          
          const totalHedgeValue = initialHedgeMargin * leverage;
          const totalAmountToShort = totalHedgeValue / initialPrice;
          const baseHedgeAmount = totalAmountToShort * 0.1;
          
          return baseHedgeAmount;
      }

    async getHedgePositionStatus(positionId: string) {
        let positionState = this.activeHedgingPositions.get(positionId);

        if (!positionState) {
            await this.restoreStateFromSource();
            positionState = this.activeHedgingPositions.get(positionId);
            if (!positionState) {
                throw new HttpException(`No active hedge found for positionId: ${positionId}`, HttpStatus.NOT_FOUND);
            }
        }

        if (positionState.strategyType === 'GRID' && positionState.tradingPair) {
            return this.getLegacyHedgePositionStatus(positionId, positionState);
        }

        let aggregatedUnrealizedPnl = 0;
        let aggregatedRealizedPnl = 0;
        let aggregatedFees = 0;
        
        // ИСПРАВЛЕНИЕ: Явно типизируем массив
        const legsDetails: any[] = []; 

        for (const leg of positionState.legs) {
            const positionRiskData = await this.getPositionRisk(leg.tradingPair, positionState.isSimulation ? positionState : undefined);
            const currentPositionOnBinance = positionRiskData.find(p => p.symbol === leg.tradingPair && parseFloat(p.positionAmt) !== 0);

            let unrealizedPnl = 0;
            let hedgePositionSize = 0;
            let lastPrice = 0;
            let markPrice = 0;
            let currentZone = 0;

            try { lastPrice = await this.getLastPrice(leg.tradingPair); } catch {}
            
            if (currentPositionOnBinance) {
                const entryPrice = parseFloat(currentPositionOnBinance.entryPrice);
                hedgePositionSize = Math.abs(parseFloat(currentPositionOnBinance.positionAmt));
                markPrice = parseFloat(currentPositionOnBinance.markPrice);
                const priceForPnl = lastPrice > 0 ? lastPrice : markPrice;
                unrealizedPnl = (entryPrice - priceForPnl) * hedgePositionSize;
            }

            const priceForZoneCheck = lastPrice > 0 ? lastPrice : markPrice;
            if(priceForZoneCheck > 0) {
                const sortedZones = [...leg.ordersSettings].sort((a,b) => a.zone - b.zone);
                for (const zoneSetting of sortedZones) {
                    if (zoneSetting.orderPrice && priceForZoneCheck <= zoneSetting.orderPrice) {
                        currentZone = zoneSetting.zone;
                    }
                }
            }
            
            aggregatedUnrealizedPnl += unrealizedPnl;
            aggregatedRealizedPnl += leg.totalRealizedPnl;
            aggregatedFees += leg.totalFeesPaid;
            
            legsDetails.push({
                tradingPair: leg.tradingPair,
                currentPrice: lastPrice > 0 ? lastPrice : markPrice,
                currentZone: currentZone,
                hedgePositionSize: hedgePositionSize,
                unrealizedPnl: unrealizedPnl,
                realizedPnl: leg.totalRealizedPnl,
                feesPaid: leg.totalFeesPaid,
                avgEntryPrice: leg.lastAveragePrice,
            });
        }
        
        const overallHedgePnl = aggregatedUnrealizedPnl + aggregatedRealizedPnl - aggregatedFees;

        return {
            positionId: positionId,
            strategyType: positionState.strategyType,
            pairName: positionState.pairName,
            isActive: positionState.isActive,
            isSimulation: positionState.isSimulation,
            totalValue: positionState.totalValue,
            hedgePnl: overallHedgePnl,
            unrealizedPnl: aggregatedUnrealizedPnl,
            realizedPnl: aggregatedRealizedPnl,
            totalFeesPaid: aggregatedFees,
            history: positionState.history,
            legs: legsDetails,
        };
    }

    private async getLegacyHedgePositionStatus(positionId: string, positionState: HedgePositionState) {
        if (!positionState.tradingPair) {
            throw new Error("Legacy position state is missing tradingPair.");
        }
        try {
            const positionRiskData = await this.getPositionRisk(positionState.tradingPair, positionState.isSimulation ? positionState : undefined);
            const currentPositionOnBinance = positionRiskData.find(p => p.symbol === positionState.tradingPair && parseFloat(p.positionAmt) !== 0);

            const realizedPnl = positionState.totalRealizedPnl || 0;
            const totalFeesPaid = positionState.totalFeesPaid || 0;
            let unrealizedPnl = 0;
            if (currentPositionOnBinance) {
                unrealizedPnl = parseFloat(currentPositionOnBinance.unRealizedProfit);
            }
            const overallHedgePnl = unrealizedPnl + realizedPnl - totalFeesPaid;
            
            return {
                positionId: positionId,
                strategyType: positionState.strategyType,
                pairName: positionState.pairName,
                isActive: positionState.isActive,
                isSimulation: positionState.isSimulation,
                totalValue: positionState.totalValue,
                hedgePnl: overallHedgePnl,
                unrealizedPnl: unrealizedPnl,
                realizedPnl: realizedPnl,
                totalFeesPaid: totalFeesPaid,
                history: positionState.history,
                // Для легаси-позиций детализация по ногам будет пустой
                legs: [],
            };
        } catch (error) {
            this.logger.error(`Failed to execute getLegacyHedgePositionStatus for ${positionId}:`, error);
            throw new HttpException(`Failed to fetch real-time position data from Binance`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    public async recalculateHedgeZones(plan: HedgePlan): Promise<HedgePlan> {
        this.logger.log(`Recalculating hedge zones for plan on pair: ${plan.pairName}`);
        if (!plan || !plan.pairName || !plan.totalValue || !plan.legs || plan.legs.length === 0) {
            throw new BadRequestException('Invalid plan data provided for recalculation.');
        }
        const params: CalculationParams = {
            strategyType: plan.strategyType as 'GRID' | 'DUAL_GRID',
            totalValue: plan.totalValue.toString(),
            pairName: plan.pairName,
            legs: plan.legs.map(leg => ({
                binanceSymbol: leg.tradingPair,
                range: {
                    lower: leg.range.lower.toString(),
                    upper: leg.range.upper.toString()
                }
            }))
        };
        return this.calculateHedgePlan(params);
    }

    public async getAccountBalance(): Promise<{ availableBalance: string }> {
        this.logger.log('Fetching account balance from Binance...');
        try {
            const balances = await this.makeRequest<any[]>('/fapi/v2/balance', 'GET');
            const usdtBalance = balances.find(b => b.asset === 'USDT');
    
            if (!usdtBalance) {
                this.logger.warn('USDT balance not found in the account.');
                return { availableBalance: '0.00' };
            }
    
            this.logger.log(`Found USDT balance: ${usdtBalance.availableBalance}`);
            return { availableBalance: usdtBalance.availableBalance };
    
        } catch (error) {
            this.logger.error('Failed to fetch account balance from Binance.', error);
            throw new HttpException('Could not fetch Binance account balance.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private async saveHedgeState(positionId: string, state: HedgePositionState): Promise<void> {
        try {
            const liquidityBotHost = this.configService.get<string>('LIQUIDITY_BOT_HOST');
            // Предполагается, что вы создадите такой эндпоинт в liquidity-bot
            await axios.post(`http://${liquidityBotHost}/liquidity/internal/positions/${positionId}/update-state`, state);
            this.logger.log(`[${positionId}] Successfully saved hedge state to DB.`);
        } catch (error) {
            this.logger.error(`[${positionId}] FAILED to save hedge state.`, error.message);
        }
    }

    public async remapHedgePosition(oldPositionId: string, newPositionId: string): Promise<{ message: string }> {
        this.logger.log(`Remapping in-memory hedge key from ${oldPositionId} to ${newPositionId}`);

        const positionState = this.activeHedgingPositions.get(oldPositionId);

        if (!positionState) {
            this.logger.error(`[REMAP FAILED] Cannot find active hedge for old positionId: ${oldPositionId} in memory map.`);
            // Не возвращаем ошибку, чтобы не прерывать процесс ребалансировки
            return { message: `Hedge for ${oldPositionId} not found in active memory. Remap skipped.` };
        }

        this.activeHedgingPositions.delete(oldPositionId);
        this.activeHedgingPositions.set(newPositionId, positionState);
        this.logger.log(`[REMAP] Successfully remapped in-memory key.`);

        // 2. Выполняем действия в зависимости от типа стратегии
        if (positionState.strategyType === 'DELTA_NEUTRAL') {
            this.logger.log(`[REMAP] Position is DELTA_NEUTRAL. Triggering adjustment and resuming...`);
            // Запускаем корректировку хеджа
            await this.checkDeltaNeutralHedge(newPositionId, positionState);
            // Снимаем с паузы (checkDeltaNeutralHedge уже сохранит состояние, но мы сохраним еще раз для надежности)
            positionState.isActive = true;
            await this.saveHedgeState(newPositionId, positionState);
            this.logger.log(`[REMAP] Hedging for new position ${newPositionId} has been RESUMED.`);
            return { message: `Hedge remapped and resumed for ${newPositionId}` };
        } 
        
        // Для сеточной ('GRID') или неопределенной стратегии просто сохраняем состояние с новым ID
        this.logger.log(`[REMAP] Position is GRID. Just saving state with new ID.`);
        await this.saveHedgeState(newPositionId, positionState);
        return { message: `Hedge successfully remapped for GRID position ${newPositionId}` };
    }

    // --- Вспомогательные и низкоуровневые методы ---
    private createSignature = (queryString: string): string => crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
    private async syncServerTime() { try { const res = await firstValueFrom(this.httpService.get(`${this.baseUrl}/fapi/v1/time`)); this.serverTimeOffset = res.data.serverTime - Date.now(); } catch (e) { this.logger.error('Could not sync server time'); } }
    async changeLeverage(symbol: string, leverage: number, isSimulation: boolean = false) {
        if (isSimulation) {
            this.logger.warn(`[SIMULATION] Faking leverage change for ${symbol} to ${leverage}x`);
            return { symbol, leverage, msg: 'Leverage changed successfully (simulated)' };
        } 
        this.logger.log(`Setting leverage for ${symbol} to ${leverage}x`); 
        return this.makeRequest('/fapi/v1/leverage', 'POST', { symbol, leverage }); 
    }

    async placeOrder(params: CreateOrderParams, isSimulation: boolean = false): Promise<OrderResult> {
        if (isSimulation) {
            this.logger.warn(`[SIMULATION] Faking order placement:`, params);
            const currentPrice = await this.getLastPrice(params.symbol);
            const simulatedResult: OrderResult = {
                orderId: Date.now(),
                avgPrice: String(currentPrice),
                executedQty: String(params.quantity),
            };
            this.simulatedOrders.set(simulatedResult.orderId, simulatedResult);
            
            const currentSimPosition = this.simulatedPositions.get(params.symbol) || { positionAmt: '0', entryPrice: '0' };
            const currentAmt = parseFloat(currentSimPosition.positionAmt);
            const currentEntry = parseFloat(currentSimPosition.entryPrice);
            const tradeAmt = parseFloat(params.quantity);
            const tradePrice = currentPrice;

            let newAmt = currentAmt;
            let newEntry = currentEntry;

            if (params.side === 'SELL') {
                newEntry = ((currentAmt * currentEntry) + (tradeAmt * tradePrice)) / (currentAmt + tradeAmt);
                newAmt += tradeAmt;
            } else { // BUY
                newAmt -= tradeAmt;
                if (newAmt === 0) newEntry = 0;
            }
            
            this.simulatedPositions.set(params.symbol, { positionAmt: String(newAmt), entryPrice: String(newEntry) });
            this.logger.log(`[SIMULATION] New simulated position for ${params.symbol}:`, this.simulatedPositions.get(params.symbol));

            return simulatedResult;
        }
        
        this.logger.log(`Placing REAL order:`, params);
        return this.makeRequest<OrderResult>('/fapi/v1/order', 'POST', params);
    }
}