import { Module } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BinanceController } from './binance.controller';
import { BinanceFuturesWebsocketService } from './services/binance-futures-websocket.service';

@Module({
  providers: [
    BinanceService,
    BinanceFuturesWebsocketService,
  ],
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [BinanceController],
})
export class BinanceModule {}
