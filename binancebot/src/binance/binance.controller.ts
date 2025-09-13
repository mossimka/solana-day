import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param, BadRequestException } from '@nestjs/common';
import { BinanceService } from './binance.service';

import { HedgePlan } from './interfaces/hedge-plan.interface';
import { ValidateValueBody } from './interfaces/validate-value-body.interface';
import { CalculationParams } from './interfaces/calculation-params.interface';
import { PrepareForRebalanceBody } from './interfaces/prepare-for-rebalance-body.interface';
import { StartDeltaNeutralHedgingBody } from './interfaces/start-delta-neutral-hedging-body.interface';
import { StartHedgingBody } from './interfaces/start-hedging-body.interface';
import { StopHedgingBody } from './interfaces/stop-hedging-body.interface';
import { RemapHedgeBody } from './interfaces/remap-hedge-body.interface';

@Controller('binance')
export class BinanceController {
  constructor(private readonly binanceService: BinanceService) {}

  @Post('hedging/calculate-plan')
  calculateHedgePlan(@Body() body: CalculationParams) {
    if (!body.strategyType || !body.totalValue || !body.legs || body.legs.length === 0) {
      throw new BadRequestException('strategyType, totalValue, and at least one leg are required.');
    }
    return this.binanceService.calculateHedgePlan(body);
  }

  @Post('hedging/start')
  startHedging(@Body() body: StartHedgingBody) {
    if (!body.positionId || !body.pairName || !body.totalValue || !body.range || !body.hedgePlan) {
      throw new BadRequestException('positionId, pairName, totalValue, range, and hedgePlan are required.');
    }
    return this.binanceService.startHedgingProcess(
      body.positionId,
      body.pairName,
      body.totalValue,
      body.range,
      body.hedgePlan
    );
  }

  @Post('hedging/stop')
  async stopHedging(@Body() body: StopHedgingBody) {
    if (!body.positionId) {
      throw new BadRequestException('positionId is required.');
    }
    return this.binanceService.stopHedgingForPosition(body.positionId);
  }

  @Get('hedging/status/:positionId')
  getHedgeStatus(@Param('positionId') positionId: string) {
    if (!positionId) {
      throw new BadRequestException('positionId is required');
    }
    return this.binanceService.getHedgePositionStatus(positionId);
  }

  @Post('hedging/recalculate-plan')
  @HttpCode(HttpStatus.OK)
  recalculatePlan(@Body() plan: HedgePlan) {
    return this.binanceService.recalculateHedgeZones(plan);
  }

  @Get('tradable-symbols')
  getTradableSymbols() {
    return this.binanceService.getTradableSymbols();
  }

  @Get('account/balance')
  getAccountBalance() {
    return this.binanceService.getAccountBalance();
  }

  @Post('hedging/remap')
  @HttpCode(HttpStatus.OK)
  remapHedging(@Body() body: RemapHedgeBody) {
    if (!body.oldPositionId || !body.newPositionId) {
      throw new BadRequestException('oldPositionId and newPositionId are required.');
    }
    return this.binanceService.remapHedgePosition(body.oldPositionId, body.newPositionId);
  }

  @Post('hedging/start-simulation')
  startHedgingSimulation(@Body() body: StartHedgingBody) {
    if (!body.positionId || !body.hedgePlan) {
      throw new BadRequestException('positionId and hedgePlan are required for simulation.');
    }
    return this.binanceService.startHedgingSimulation(body.positionId, body.hedgePlan);
  }

  @Post('hedging/start-delta-neutral')
  startDeltaNeutralHedging(@Body() body: StartDeltaNeutralHedgingBody) {
    if (!body.positionId || !body.pairName || !body.tradingPair) {
      throw new BadRequestException('positionId, pairName, and tradingPair are required.');
    }
    return this.binanceService.startDeltaNeutralHedging(body);
  }

  @Post('internal/prepare-for-rebalance')
  @HttpCode(HttpStatus.OK)
  prepareForRebalance(@Body() body: PrepareForRebalanceBody) {
    if (!body.positionId) {
      throw new BadRequestException('positionId is required.');
    }
    return this.binanceService.prepareForRebalance(body.positionId);
  }

  @Post('hedging/start-delta-neutral-simulation')
  startDeltaNeutralHedgingSimulation(@Body() body: StartDeltaNeutralHedgingBody) {
    if (!body.positionId || !body.pairName || !body.tradingPair) {
      throw new BadRequestException('positionId, pairName, and tradingPair are required.');
    }
    return this.binanceService.startDeltaNeutralHedging({ ...body, isSimulation: true });
  }

  @Post('hedging/start-dual-delta-neutral')
  startDualDeltaNeutralHedging(@Body() body: any) {
    if (!body.positionId || !body.pairName || !body.legs || body.legs.length === 0) {
      throw new BadRequestException('positionId, pairName, and at least one leg are required.');
    }
    return this.binanceService.startDualDeltaNeutralHedging(body);
  }

  @Post('hedging/start-dual-delta-neutral-simulation')
  startDualDeltaNeutralHedgingSimulation(@Body() body: any) {
    if (!body.positionId || !body.pairName || !body.totalValue || !body.legs || body.legs.length === 0) {
      throw new BadRequestException('positionId, pairName, totalValue, and at least one leg are required for dual simulation.');
    }
    return this.binanceService.startDualDeltaNeutralHedging({ ...body, isSimulation: true });
  }

  @Post('hedging/validate-value')
  @HttpCode(HttpStatus.OK)
  validateValue(@Body() body: ValidateValueBody) {
    if (!body.totalValue || !body.legs || body.legs.length === 0) {
      throw new BadRequestException('totalValue and legs are required.');
    }
    return this.binanceService.validateValue(body);
  }
}
