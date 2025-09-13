import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable()
export class BinanceFuturesWebsocketService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(BinanceFuturesWebsocketService.name);
  private readonly baseWsUrl: string;
  private userWs: WebSocket;
  private priceWs: WebSocket;
  private ws: WebSocket | null = null;
  private priceMap = new Map<string, string>();
  private priceBehaviorSubjects = new Map<string, BehaviorSubject<string>>();
  private messageSubject = new Subject<any>();

  constructor(private readonly configService: ConfigService) {
    this.baseWsUrl = this.configService.get<string>(
      'BINANCE_WS_URL',
      'wss://testnet.binancefuture.com/ws-fapi/v1s',
    );
  }

  onModuleInit() {
    this.logger.log('Initializing Binance Futures WebSocket service');
  }

  onModuleDestroy() {
    this.closeConnection();
  }

  public connectToUserStream(listenKey: string) {
    if (this.userWs && this.userWs.readyState === WebSocket.OPEN) {
      this.logger.log(
        'User data WebSocket is already connected. Closing old connection to reconnect.',
      );
      this.userWs.close();
    }
    const url = `wss://fstream.binance.com/ws/${listenKey}`;
    this.userWs = new WebSocket(url);
    this.setupUserListeners();
  }

  private setupUserListeners() {
    this.userWs.on('open', () =>
      this.logger.log('User data WebSocket connected successfully.'),
    );
    this.userWs.on('ping', () => {
      this.userWs.pong();
    });
    this.userWs.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        if (message.e === 'ORDER_TRADE_UPDATE') {
          this.logger.log(
            `[WebSocket] Order Update Received: ${message.o.s} ${message.o.S} ${message.o.q}@${message.o.p}, Status: ${message.o.X}`,
          );
        }
      } catch (e) {
        this.logger.error('Failed to parse user stream message:', data);
      }
    });
    this.userWs.on('close', (code, reason) => {
      this.logger.warn(
        `User data WebSocket disconnected. Code: ${code}, Reason: ${reason.toString()}`,
      );
    });
    this.userWs.on('error', (error) => {
      this.logger.error('User data WebSocket error:', error);
    });
  }

  private createConnection(): void {
    if (this.ws) {
      return;
    }
    this.logger.log(
      `Connecting to Binance Futures WebSocket: ${this.baseWsUrl}`,
    );
    this.ws = new WebSocket(this.baseWsUrl);
    this.ws.on('open', () => {
      this.logger.log('Binance Futures WebSocket connection established');
    });
    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const rawMessage = JSON.parse(data.toString());
        const message = rawMessage.data ? rawMessage.data : rawMessage;
        this.logger.debug(
          `Received raw message: ${JSON.stringify(rawMessage)}`,
        );
        if (message.e === 'aggTrade') {
          const symbol = message.s;
          const price = message.p;
          this.priceMap.set(symbol, price);
          if (this.priceBehaviorSubjects.has(symbol)) {
            this.priceBehaviorSubjects.get(symbol)?.next(data.toString());
          }
          this.messageSubject.next(rawMessage);
        }
      } catch (error) {
        this.logger.error(
          `Error parsing WebSocket message: ${error.message}`,
          data.toString(),
        );
      }
    });
    this.ws.on('error', (error) => {
      this.logger.error(`WebSocket error: ${error.message}`);
    });
    this.ws.on('close', (code, reason) => {
      this.logger.warn(`WebSocket connection closed: ${code} - ${reason}`);
      this.ws = null;
      setTimeout(() => {
        this.logger.log('Attempting to reconnect WebSocket...');
        this.createConnection();
        this.subscribeToAllActivePairs();
      }, 5000);
    });
  }

  public closeConnection(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.logger.log('WebSocket connection closed');
    }
  }

  private subscribeToAllActivePairs(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const symbols = Array.from(this.priceBehaviorSubjects.keys());
    if (symbols.length === 0) {
      return;
    }
    const subscribeRequest = {
      method: 'SUBSCRIBE',
      params: symbols.map((symbol) => `${symbol.toLowerCase()}@aggTrade`),
      id: Date.now(),
    };
    this.ws.send(JSON.stringify(subscribeRequest));
    this.logger.log(
      `Resubscribed to mark price updates for: ${symbols.join(', ')}`,
    );
  }

  public subscribeToMarkPrice(symbol: string): Observable<string> {
    const upperSymbol = symbol.toUpperCase();
    if (!this.priceBehaviorSubjects.has(upperSymbol)) {
      this.priceBehaviorSubjects.set(
        upperSymbol,
        new BehaviorSubject<string>('0'),
      );
    }
    if (!this.ws) {
      this.createConnection();
    }
    const sendSubscription = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const subscribeRequest = {
          method: 'SUBSCRIBE',
          params: [`${upperSymbol.toLowerCase()}@aggTrade`],
          id: Date.now(),
        };
        this.ws.send(JSON.stringify(subscribeRequest));
        this.logger.log(`Subscribed to mark price updates for: ${upperSymbol}`);
      } else if (this.ws) {
        this.logger.log(`WebSocket not ready for ${upperSymbol}, waiting...`);
        setTimeout(sendSubscription, 500);
      } else {
        this.logger.log(
          `No WebSocket connection for ${upperSymbol}, creating...`,
        );
        this.createConnection();
        setTimeout(sendSubscription, 500);
      }
    };
    sendSubscription();
    return this.priceBehaviorSubjects.get(upperSymbol)!.asObservable();
  }

  public unsubscribeFromMarkPrice(symbol: string): void {
    const upperSymbol = symbol.toUpperCase();
    if (
      this.priceBehaviorSubjects.has(upperSymbol) &&
      this.ws &&
      this.ws.readyState === WebSocket.OPEN
    ) {
      const unsubscribeRequest = {
        method: 'UNSUBSCRIBE',
        params: [`${upperSymbol.toLowerCase()}@aggTrade`],
        id: Date.now(),
      };
      this.ws.send(JSON.stringify(unsubscribeRequest));
      this.logger.log(
        `Unsubscribed from mark price updates for: ${upperSymbol}`,
      );
      this.priceBehaviorSubjects.get(upperSymbol)?.complete();
      this.priceBehaviorSubjects.delete(upperSymbol);
    }
  }

  public getCurrentPrice(symbol: string): string | null {
    const upperSymbol = symbol.toUpperCase();
    return this.priceMap.get(upperSymbol) || null;
  }

  public getMessages(): Observable<any> {
    if (!this.ws) {
      this.createConnection();
    }
    return this.messageSubject.asObservable();
  }

  public getMessagesByType(eventType: string): Observable<any> {
    return this.getMessages().pipe(filter((msg) => msg.e === eventType));
  }
}