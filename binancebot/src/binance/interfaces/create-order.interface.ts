export interface CreateOrderParams {
  /** Символ торговой пары, например 'BTCUSDT' */
  symbol: string;

  /** Тип стороны: 'BUY' или 'SELL' */
  side: 'BUY' | 'SELL';

  /** Тип ордера: 'LIMIT', 'MARKET', 'STOP', 'TAKE_PROFIT', 'STOP_MARKET', 'TAKE_PROFIT_MARKET' и т.д. */
  type:
    | 'LIMIT'
    | 'MARKET'
    | 'STOP'
    | 'TAKE_PROFIT'
    | 'STOP_MARKET'
    | 'TAKE_PROFIT_MARKET';

  /** Срок действия (для LIMIT ордеров): 'GTC' (до отмены), 'IOC' (исполнить немедленно или отменить), 'FOK' (полностью или отменить) */
  timeInForce?: 'GTC' | 'IOC' | 'FOK';

  /** Количество для торговли */
  quantity: string;

  /** Цена (обязательна для LIMIT ордеров) */
  price?: string;

  /** Уникальный ID клиента */
  newClientOrderId?: string;

  /** Цена активации для STOP/TAKE_PROFIT ордеров */
  stopPrice?: string;

  /** Работать ли в редуцирующем режиме */
  reduceOnly?: 'true' | 'false';

  /** Закрывать ли позицию */
  closePosition?: 'true' | 'false';

  /** Активировать ли защиту позиции */
  priceProtect?: 'true' | 'false';

  /** Уровень маржи для ордера, доступно для крестовой маржи */
  workingType?: 'MARK_PRICE' | 'CONTRACT_PRICE';
}
