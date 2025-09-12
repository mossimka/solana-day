import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';

import { Connection, PublicKey, Keypair, SendTransactionError, Transaction, TransactionInstruction,  ComputeBudgetProgram } from '@solana/web3.js';
import { Repository } from 'typeorm';
import { Raydium, ApiV3PoolInfoConcentratedItem, PoolUtils, TickUtils, ClmmKeys, getPdaPersonalPositionAddress, CLMM_PROGRAM_ID, PositionInfoLayout, PositionUtils, U64_IGNORE_RANGE, ApiV3Token, TickArrayLayout } from '@raydium-io/raydium-sdk-v2';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { Decimal } from 'decimal.js';
import axios from 'axios';
import * as cron from 'node-cron';
import { BN } from 'bn.js'; 

import { PoolInfo, PositionInfo } from '../interfaces/pool-info.interface';
import { UserParams } from '../interfaces/user-params.interface';
import { ValidPair } from '../interfaces/valid-pair.interface';
import { RebalanceCompletionData } from '../interfaces/rebalance-completion-data.interface';
import { DeltaNeutralValidationBody } from '../interfaces/delta-neutral-validation.interface';

import { createWalletFromSecretKey } from '../utils/solana.utils';
import { initSdk, txVersion } from '../config/config';
import { isValidClmm } from '../utils/raydium.utils';
import { Position } from '../entities/position.entity';
import { SessionWallet } from '../entities/session-wallet.entity';
import { CryptoService } from './crypto.service';

const anchorDataBuf = {
    decreaseLiquidity: Buffer.from([0x24, 0x9d, 0x92, 0x1c, 0xec, 0x17, 0x50, 0x73]),
};

export class LiquidityBotService {
    private positionRepository: Repository<Position>;
    private sessionWalletRepository: Repository<SessionWallet>;
    private cryptoService: CryptoService;
    private connection: Connection;
    private raydium!: Raydium; 
    private cluster: string;
    private readonly coinMarketCapApiKey: string;
    private currentOwnerPk: PublicKey | null = null;
    private cachedPairs: PoolInfo[] = [];
    private lastCacheTime: number = 0;
    private readonly CLMM_PROGRAM_ID = new PublicKey('CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK');
    private readonly birdeyeApiKey: string;
    private readonly moralisApiKey: string;
    private readonly analyticsServiceHost: string;
    private readonly scannerHost: string;

    constructor(
        positionRepository: Repository<Position>,
        sessionWalletRepository: Repository<SessionWallet>,
        cryptoService: CryptoService
    ) {
        this.positionRepository = positionRepository;
        this.sessionWalletRepository = sessionWalletRepository;
        this.cryptoService = cryptoService;
        const coinMarketCapApiKey = process.env.COINMARKETCAP_API_KEY;
        const birdeyeApiKey = process.env.BIRDEYE_API_KEY;
        const moralisApiKey = process.env.MORALIS_API_KEY;
        const scannerHost = process.env.SCANNER_HOST;
        if (!coinMarketCapApiKey || !birdeyeApiKey || !moralisApiKey || !scannerHost) {
            throw new Error('CRITICAL: One or more required API keys or HOSTs are not configured in .env file!');
        }

        this.coinMarketCapApiKey = coinMarketCapApiKey;
        this.birdeyeApiKey = birdeyeApiKey;
        this.moralisApiKey = moralisApiKey;
        this.scannerHost = scannerHost;
        this.analyticsServiceHost = process.env.ANALYTICS_SERVICE_HOST || 'http://127.0.0.1:8000';

        this.cluster = 'mainnet';
        const rpcUrl = 'https://mainnet.helius-rpc.com/?api-key=ec7871b0-d394-4763-a453-02b32dfe92f8';
        this.connection = new Connection(rpcUrl, 'confirmed');
        console.log(`Initialized with RPC: ${rpcUrl}`);
    }


    onModuleInit() {
    console.log('LiquidityBotService initialized. Scheduling cron jobs...');
    this.schedulePoolPopulation();
    }

  private schedulePoolPopulation(): void {
 
    cron.schedule('0 0 * * *', () => {
      console.log('CRON JOB: Starting scheduled execution of populate-pools script...');

      const projectRoot = path.join(__dirname, '..', '..');
      const command = 'npm run populate-pools';

      exec(command, { cwd: projectRoot }, (error, stdout, stderr) => {
        if (error) {
          console.error(`CRON JOB FAILED: Error executing populate-pools script: ${error.message}`);
          return;
        }
        if (stderr) {
          // Записываем stderr как обычный лог, т.к. некоторые инструменты пишут туда информацию о процессе
          console.log(`CRON JOB STDERR: ${stderr}`);
        }
        console.log(`CRON JOB SUCCESS: populate-pools script finished successfully.`);
        console.log(`CRON JOB STDOUT: ${stdout}`);
      });
    }, {
      timezone: "Asia/Almaty"
    });

    console.log('Successfully scheduled the populate-pools script to run daily at midnight (Almaty time).');
  }

  private async getOwnerKeypair(): Promise<Keypair> {
    const walletRecords = await this.sessionWalletRepository.find({
      order: {
        created_at: 'DESC',  
      },
      take: 1,  
    });

    const latestWallet = walletRecords.length > 0 ? walletRecords[0] : null;

    if (!latestWallet) {
      throw new Error('Private key is not set. Please save a private key first.', HttpStatus.UNAUTHORIZED);
    }

    const decryptedSecret = this.cryptoService.decrypt(latestWallet.encrypted_key, latestWallet.iv);
    return createWalletFromSecretKey(decryptedSecret);
  }

  async initialize(owner: Keypair): Promise<void> {
 
    if (this.raydium && this.currentOwnerPk?.equals(owner.publicKey)) {
        return;
    }
    try {
        this.raydium = await initSdk(this.connection, owner, this.cluster);
        this.currentOwnerPk = owner.publicKey; 
        console.log(`Raydium SDK initialized for wallet: ${owner.publicKey.toBase58()}`);
    } catch (error) {
        console.error(`Failed to initialize Raydium SDK: ${error.message}`);
        throw error;
    }
  }

  async savePrivateKey(privateKey: string): Promise<void> {
    if (!privateKey) {
        throw new Error('Private key cannot be empty.', HttpStatus.BAD_REQUEST);
    }
    const { iv, encryptedData } = this.cryptoService.encrypt(privateKey);
 
    await this.sessionWalletRepository.clear();

    const newWalletRecord = this.sessionWalletRepository.create({
        encrypted_key: encryptedData,
        iv: iv,
    });
    await this.sessionWalletRepository.save(newWalletRecord);
    console.log('A new private key has been encrypted and saved.');
  }
  
async getPoolInfo(poolId: string) {
 
  if (!this.raydium) {
    this.raydium = await Raydium.load({ connection: this.connection, disableFeatureCheck: true });
  }

  try {
    const rpcData = await this.raydium.clmm.getRpcClmmPoolInfo({ poolId });
    return rpcData;
  } catch (error) {
    console.error(`Failed to fetch pool info for poolId ${poolId}: ${error.message}`);
    throw new Error('Unable to fetch pool info');
  }
}

async setupLiquidityPosition(params: any, hedgePlan: any) {
  const owner = await this.getOwnerKeypair();
  await this.initialize(owner);
  
  const poolId = params.poolId;
  const data = await this.raydium.api.fetchPoolById({ ids: poolId });
  const poolInfo = data[0] as ApiV3PoolInfoConcentratedItem;

  if (!isValidClmm(poolInfo.programId)) {
      throw new Error('Target pool is not a CLMM pool');
  }

  const rpcData = await this.raydium.clmm.getRpcClmmPoolInfo({ poolId: poolInfo.id });
  const currentPrice = rpcData.currentPrice;

  const percent = params.priceRangePercent / 100;
  const startPrice = currentPrice * (1 - percent);
  const endPrice = currentPrice * (1 + percent);

  if (currentPrice < startPrice || currentPrice > endPrice) {
      throw new Error(`Current price (${currentPrice}) is outside the specified range [${startPrice}, ${endPrice}].`, HttpStatus.BAD_REQUEST);
  }

  const { tick: lowerTick } = TickUtils.getPriceAndTick({ poolInfo, price: new Decimal(startPrice), baseIn: true });
  const { tick: upperTick } = TickUtils.getPriceAndTick({ poolInfo, price: new Decimal(endPrice), baseIn: true });

  const epochInfo = await this.raydium.fetchEpochInfo();
  const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
      poolInfo, slippage: 0.5, inputA: true,
      tickUpper: Math.max(lowerTick, upperTick), tickLower: Math.min(lowerTick, upperTick),
      amount: new BN(new Decimal(params.inputAmount).mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
      add: true, amountHasFee: true, epochInfo,
  });

  const { execute, extInfo } = await this.raydium.clmm.openPositionFromBase({
      poolInfo, poolKeys: undefined,
      tickUpper: Math.max(lowerTick, upperTick), tickLower: Math.min(lowerTick, upperTick),
      base: 'MintA', ownerInfo: { useSOLBalance: true },
      baseAmount: new BN(new Decimal(params.inputAmount).mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
      otherAmountMax: res.amountSlippageB.amount,
      txVersion, computeBudgetConfig: { units: 600000, microLamports: 100000 }, nft2022: true
  });

  const { txId } = await execute({ sendAndConfirm: true });
  const positionId = extInfo.nftMint.toBase58();
  
  let openFeeUSD = 0;
  try {
      const txDetails = await this.connection.getTransaction(txId, { maxSupportedTransactionVersion: 0 });
      if (txDetails && txDetails.meta) {
          const feeInLamports = txDetails.meta.fee;
          const feeInSol = feeInLamports / 1_000_000_000;
          const solPriceData = await this.getTokenPrices('SOL');
          const solPrice = solPriceData['SOL'] || 0;
          openFeeUSD = feeInSol * solPrice;
          console.log(`Transaction fee for opening ${positionId}: ${feeInSol} SOL (${openFeeUSD.toFixed(4)} USD)`);
      }
  } catch (error) {
      console.error(`Failed to fetch transaction fee for ${txId}: ${error.message}`);
  }

  const { position: positionInfoData } = await this.positionInfo(positionId, owner);
  const symbolA = poolInfo.mintA.symbol === 'WSOL' ? 'SOL' : poolInfo.mintA.symbol;
  const symbolB = poolInfo.mintB.symbol === 'WSOL' ? 'SOL' : poolInfo.mintB.symbol;
  const prices = await this.getTokenPrices(`${symbolA},${symbolB}`);
  const initialPriceA = prices[symbolA] || 0;
  const initialPriceB = prices[symbolB] || 0;
  const initialValue = (params.inputAmount * initialPriceA) + (Number(positionInfoData.quoteAmount) * initialPriceB);

  const position = this.positionRepository.create({
      positionId, 
      poolId: params.poolId,
      hedgeExchange: params.exchange,
      initialBaseAmount: params.inputAmount.toString(),
      initialQuoteAmount: positionInfoData.quoteAmount,
      initialPriceA, initialPriceB, initialValue,
      startPrice, endPrice,
      hedgePlan: hedgePlan,
      transactionCosts: openFeeUSD,
  });
  await this.positionRepository.save(position);

  try {
      const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(positionId);

      if (params.strategyType === 'DELTA_NEUTRAL') {
          console.log(`Strategy is DELTA_NEUTRAL. Calling the specialized endpoint on ${exchangePrefix}.`);
          
          // Для DN не нужен сеточный план, но нужна информация о "ногах" хеджа.
          const payload = {
              positionId: positionId,
              pairName: `${params.baseMint}/${params.quoteMint}`,
              totalValue: initialValue,
              isSimulation: false,
              legs: hedgePlan?.legs, // Фронтенд должен прислать эту информацию
          };

          // Валидация специфичная для DN
          if (!payload.legs || !Array.isArray(payload.legs) || payload.legs.length === 0) {
              throw new Error('Hedge leg information is required for DELTA_NEUTRAL strategy.');
          }
          
          await axios.post(`http://${futuresHost}/${exchangePrefix}/hedging/start-dual-delta-neutral`, payload);
          
      } else { // GRID / DUAL_GRID
          console.log(`Using default GRID/DUAL_GRID hedging logic on ${exchangePrefix}.`);
          
          // ✅ Валидация для сеточных стратегий теперь находится здесь
          if (!hedgePlan || !hedgePlan.strategyType || !hedgePlan.legs || hedgePlan.legs.length === 0) {
              throw new Error('Invalid or missing hedgePlan for GRID strategy. Cannot start hedge.');
          }

          const payload = {
              positionId: positionId,
              pairName: hedgePlan.pairName,
              totalValue: initialValue.toString(),
              range: { lower: startPrice.toString(), upper: endPrice.toString() },
              hedgePlan: hedgePlan,
          };

          await axios.post(`http://${futuresHost}/${exchangePrefix}/hedging/start`, payload);
      }

      console.log(`Successfully notified futures service to start hedging for ${positionId}.`);

  } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Failed to notify futures service for position ${positionId}: ${errorMessage}`);
      // ВАЖНО: На этом этапе позиция на Solana уже создана.
      // Бросаем ошибку клиенту, чтобы он знал о частичном сбое.
      throw new Error(`On-chain position created, but hedge start failed: ${errorMessage}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
  
  return { status: 'success', mint: positionId, txId: txId };
}

async closePosition(nftMint: string) {
    const owner = await this.getOwnerKeypair();
    await this.initialize(owner);
    console.log(`Attempting to close position using API-FETCHED pool info for NFT: ${nftMint}`);

    const positionNftMint = new PublicKey(nftMint);

    // 1. Получаем данные о позиции, как и раньше
    const allPositions = await this.raydium.clmm.getOwnerPositionInfo({ programId: this.CLMM_PROGRAM_ID });
    const positionData = allPositions.find((p) => p.nftMint.equals(positionNftMint));
    if (!positionData) {
        throw new Error(`Position ${nftMint} not found.`, HttpStatus.NOT_FOUND);
    }

    // --- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Получаем данные о пуле через API Raydium ---
    console.log(`Fetching RICH pool info from Raydium API for pool: ${positionData.poolId.toBase58()}`);
    const apiPoolData = await this.raydium.api.fetchPoolById({ ids: positionData.poolId.toBase58() });
    if (!apiPoolData || apiPoolData.length === 0) {
        throw new Error(`Could not fetch pool info from Raydium API for pool ${positionData.poolId.toBase58()}`, HttpStatus.NOT_FOUND);
    }
    const poolInfo = apiPoolData[0] as ApiV3PoolInfoConcentratedItem;
    // -----------------------------------------------------------------
    
    // Получаем poolKeys отдельно, они могут понадобиться для closePosition
    const { poolKeys } = await this.raydium.clmm.getPoolInfoFromRpc(positionData.poolId.toBase58());


    // --- ЭТАП 1: Вывод ликвидности с правильными данными о пуле ---
    if (!positionData.liquidity.isZero()) {
        console.log('STEP 1: Decreasing liquidity with API-provided poolInfo.');
        try {
            const { execute: executeDecrease } = await this.raydium.clmm.decreaseLiquidity({
                poolInfo, // <-- Используем полный объект, полученный от API
                poolKeys,
                ownerPosition: positionData,
                ownerInfo: { useSOLBalance: true, closePosition: false },
                liquidity: positionData.liquidity,
                amountMinA: new BN(0),
                amountMinB: new BN(0),
                txVersion,
                computeBudgetConfig: { units: 800000, microLamports: 100000 },
            });
            const { txId } = await executeDecrease({ sendAndConfirm: true });
            console.log(`Liquidity decreased successfully. TX: ${txId}`);
        } catch (error) {
            console.error('STEP 1 FAILED: Could not decrease liquidity.', error);
            throw error;
        }
    } else {
        console.log('STEP 1 SKIPPED: Position liquidity is already zero.');
    }

    // --- ЭТАП 2: Закрытие пустого аккаунта ---
    console.log('STEP 2: Closing the empty position account.');
    try {
        const finalPositions = await this.raydium.clmm.getOwnerPositionInfo({ programId: this.CLMM_PROGRAM_ID });
        const positionToClose = finalPositions.find((p) => p.nftMint.equals(positionNftMint));
        if (!positionToClose) {
            this.logger.warn(`Position ${nftMint} not found after decreasing liquidity, it might be already closed.`);
            // Если позиция уже закрыта, просто удаляем из нашей БД
            await this.positionRepository.delete({ positionId: nftMint });
            return { txId: 'N/A - already closed', success: true };
        }

        const { execute: executeClose } = await this.raydium.clmm.closePosition({
            poolInfo, // <-- Используем тот же полный объект
            poolKeys,
            ownerPosition: positionToClose,
            txVersion,
            computeBudgetConfig: { units: 100000, microLamports: 100000 },
        });
        const { txId } = await executeClose({ sendAndConfirm: true });
        console.log(`Position account closed successfully. TX: ${txId}`);

        await this.positionRepository.delete({ positionId: nftMint });
        console.log(`Position ${nftMint} removed from local database.`);

        try {
          const payload = { positionId: nftMint };
          const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(nftMint);
          await axios.post(`http://${futuresHost}/${exchangePrefix}/hedging/stop`, payload);
        } catch(e) { console.error('Failed to notify futures service'); }
        
        return { txId, success: true };
    } catch (error) {
        console.error('STEP 2 FAILED: Could not close the position account.', error);
        throw error;
    }
}

async getBalanceByPool(poolId: string) {
  const owner = await this.getOwnerKeypair();
  await this.initialize(owner);
  try {
      const publicKey = owner.publicKey;  
      const data = await this.raydium.api.fetchPoolById({ ids: poolId });
      const poolInfo = data[0] as ApiV3PoolInfoConcentratedItem;
      const mintA = poolInfo.mintA;
      const mintB = poolInfo.mintB;
      const symbolA = poolInfo.mintA?.symbol === 'WSOL' ? 'SOL' : poolInfo.mintA?.symbol;
      const symbolB = poolInfo.mintB?.symbol === 'WSOL' ? 'SOL' : poolInfo.mintB?.symbol;
      
      const tokenAAta = await getAssociatedTokenAddress(new PublicKey(mintA.address), publicKey);
      const tokenBAta = await getAssociatedTokenAddress(new PublicKey(mintB.address), publicKey);

      let amountA = 0;
      let amountB = 0;

      try {
        if (mintA.symbol === 'WSOL'){
          amountA = (await this.connection.getBalance(publicKey)) / (10 ** mintA.decimals);
        } else {
          const account = await getAccount(this.connection, tokenAAta);
          amountA = Number(account.amount) / (10 ** mintA.decimals);
        }
      } catch (e) { amountA = 0; }

      try {
        if (mintB.symbol === 'WSOL'){
          amountB = (await this.connection.getBalance(publicKey)) / (10 ** mintB.decimals);
        } else {
          const account = await getAccount(this.connection, tokenBAta);
          amountB = Number(account.amount) / (10 ** mintB.decimals);
        }
      } catch (e) { amountB = 0; }
      
      const symbols = [symbolA, symbolB].filter(Boolean).join(',');
      const prices = await this.getTokenPrices(symbols);
      const priceA = prices[symbolA] || 0;
      const priceB = prices[symbolB] || 0;

      return {
        [symbolA]: { amount: amountA, valueInUSD: amountA * priceA },
        [symbolB]: { amount: amountB, valueInUSD: amountB * priceB },
      };
  } catch (error) {
      console.error(`Failed to fetch balance for pool ${poolId}: ${error.message}`);
      throw new Error(`Unable to fetch balance: ${error.message}`);
  }
}

async getTokenPrices(symbols: string): Promise<{ [symbol: string]: number }> {
  const cachedPrices: { [symbol: string]: number } = {};
  const symbolsToFetch: string[] = [];

  // Проверяем кэш
  symbols.split(',').forEach((symbol) => {
   
      symbolsToFetch.push(symbol);
  });

  if (symbolsToFetch.length === 0) {
    return cachedPrices;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await axios.get(
        `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest`,
        {
          params: {
            symbol: symbolsToFetch.join(','),
          },
          headers: {
            'X-CMC_PRO_API_KEY': this.coinMarketCapApiKey,
          },
        }
      );
      // console.log('res:', response)

      // Извлекаем цены для всех символов
      symbolsToFetch.forEach((symbol) => {
        const priceData = response.data?.data?.[symbol]?.[0]?.quote?.USD?.price;
        if (priceData) {
          const price = parseFloat(priceData);
          cachedPrices[symbol] = price;
        } else {
          this.logger.warn(`Price not found for ${symbol} on CoinMarketCap`);
          cachedPrices[symbol] = 0;
        }
      });

      return cachedPrices;
    } catch (error) {
      if (error.response?.status === 429 && attempt < 3) {
        this.logger.warn(`Rate limit exceeded for CoinMarketCap, retrying (${attempt}/3)`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      console.error(`Failed to fetch prices for ${symbols} from CoinMarketCap: ${error.message}`, error.stack);
      symbolsToFetch.forEach((symbol) => {
        cachedPrices[symbol] = 0;
      });
      return cachedPrices;
    }
  }
  return cachedPrices;
}

async positionInfo(nftMint: string, owner?: Keypair): Promise<{ position: PositionInfo; pool: PoolInfo }> {
  // Если owner не передан, получаем его. Это делает метод более гибким.
  const currentOwner = owner || await this.getOwnerKeypair();
  await this.initialize(currentOwner);

  const positionNftMint = new PublicKey(nftMint);
  const positionPubKey = getPdaPersonalPositionAddress(CLMM_PROGRAM_ID, positionNftMint).publicKey;
  const pos = await this.raydium.connection.getAccountInfo(positionPubKey);
  if (!pos) throw new Error('Position not found');
  const position = PositionInfoLayout.decode(pos.data);

  let poolInfo: ApiV3PoolInfoConcentratedItem;
  if (this.cluster === 'mainnet') {
    poolInfo = (await this.raydium.api.fetchPoolById({ ids: position.poolId.toBase58() }))[0] as ApiV3PoolInfoConcentratedItem;
  } else {
    const data = await this.raydium.clmm.getPoolInfoFromRpc(position.poolId.toBase58());
    poolInfo = data.poolInfo;
  }

  const epochInfo = await this.raydium.connection.getEpochInfo();

  const priceLower = TickUtils.getTickPrice({ poolInfo, tick: position.tickLower, baseIn: true });
  const priceUpper = TickUtils.getTickPrice({ poolInfo, tick: position.tickUpper, baseIn: true });

  const { amountA, amountB } = PositionUtils.getAmountsFromLiquidity({
    poolInfo,
    ownerPosition: position,
    liquidity: position.liquidity,
    slippage: 0,
    add: false,
    epochInfo,
  });
  const [pooledAmountA, pooledAmountB] = [
    new Decimal(amountA.amount.toString()).div(10 ** poolInfo.mintA.decimals).toString(),
    new Decimal(amountB.amount.toString()).div(10 ** poolInfo.mintB.decimals).toString(),
  ];

  const rpcPoolData = await this.raydium.clmm.getRpcClmmPoolInfo({ poolId: position.poolId });
  const currentPrice = rpcPoolData.currentPrice;

  const positionInfoData: PositionInfo = {
    positionId: positionNftMint.toBase58(),
    baseAmount: pooledAmountA,
    quoteAmount: pooledAmountB,
    priceRange: { lower: Number(priceLower.price), upper: Number(priceUpper.price) },
    currentPrice: currentPrice,
    profitability: 0,
    actionHistory: [],
    poolKeys: { id: position.poolId.toBase58() },
  };

  const poolInfoResponse: PoolInfo = {
    poolId: position.poolId.toBase58(),
    baseMint: poolInfo.mintA.symbol,
    quoteMint: poolInfo.mintB.symbol,
    currentPrice: currentPrice,
  };

  return { position: positionInfoData, pool: poolInfoResponse };
}


async fetchAllPositions(): Promise<{ positions: PositionInfo[]; pools: PoolInfo[] }> {
  const owner = await this.getOwnerKeypair();
  await this.initialize(owner);
  console.log('Fetching all user positions from the database...');

  const positionRecords = await this.positionRepository.find();
  if (!positionRecords || positionRecords.length === 0) {
      console.log('No positions found in the database.');
      return { positions: [], pools: [] };
  }

  const positions: any[] = [];
  const pools: { [key: string]: PoolInfo } = {};

  for (const record of positionRecords) {
      try {
          if (record.positionId.startsWith('test-')) {
              // Логика для тестовых позиций (не меняется)
              const fakePositionInfo: any = {
                  positionId: record.positionId,
                  baseAmount: record.initialBaseAmount,
                  quoteAmount: record.initialQuoteAmount,
                  priceRange: { lower: record.startPrice, upper: record.endPrice },
                  currentPrice: record.initialPriceA,
                  profitability: 0,
                  actionHistory: ["Created in Test Mode"],
                  poolKeys: { id: record.poolId },
                  initialValue: record.initialValue,
              };
              positions.push(fakePositionInfo);
              if (!pools[record.poolId]) {
                  pools[record.poolId] = { poolId: record.poolId, baseMint: "SOL", quoteMint: "USDC", currentPrice: record.initialPriceA };
              }
          } else {
              // Логика для РЕАЛЬНЫХ позиций
              const { position: freshPositionData, pool } = await this.fetchPositionInfo(record.positionId, owner);
              const finalPositionData = {
                  ...freshPositionData,
                  initialValue: record.initialValue
              };
              positions.push(finalPositionData);

              if (!pools[pool.poolId]) {
                  pools[pool.poolId] = pool;
              }
          }
      } catch (error) {
          // --- ИСПРАВЛЕННАЯ ЛОГИКА ---
          if (error.message === 'Position not found') {
              this.logger.warn(`Position ${record.positionId} is in DB but not on-chain. Hiding from response (likely rebalancing).`);
              // Мы просто ничего не делаем, и позиция не попадает в итоговый список.
          } else {
              console.error(`Could not process position ${record.positionId}: ${error.message}`);
          }
      }
  }
  console.log(`Successfully processed and returning ${positions.length} positions.`);
  return { positions, pools: Object.values(pools) };
}

async fetchPositionInfo(nftMint: string, owner?: Keypair): Promise<{ position: PositionInfo; pool: PoolInfo }> {
  const currentOwner = owner || await this.getOwnerKeypair();
  await this.initialize(currentOwner);

  const positionNftMint = new PublicKey(nftMint);
  const positionPubKey = getPdaPersonalPositionAddress(CLMM_PROGRAM_ID, positionNftMint).publicKey;
  const pos = await this.connection.getAccountInfo(positionPubKey);
  if (!pos) throw new Error('Position not found');
  const position = PositionInfoLayout.decode(pos.data);

  let poolInfo: ApiV3PoolInfoConcentratedItem;
  if (this.raydium.cluster === 'mainnet') {
    poolInfo = (await this.raydium.api.fetchPoolById({ ids: position.poolId.toBase58() }))[0] as ApiV3PoolInfoConcentratedItem;
  } else {
    const data = await this.raydium.clmm.getPoolInfoFromRpc(position.poolId.toBase58());
    poolInfo = data.poolInfo;
  }

  const epochInfo = await this.connection.getEpochInfo();

  const priceLower = TickUtils.getTickPrice({ poolInfo, tick: position.tickLower, baseIn: true });
  const priceUpper = TickUtils.getTickPrice({ poolInfo, tick: position.tickUpper, baseIn: true });

  const { amountA, amountB } = PositionUtils.getAmountsFromLiquidity({
    poolInfo,
    ownerPosition: position,
    liquidity: position.liquidity,
    slippage: 0,
    add: false,
    epochInfo,
  });
  const [pooledAmountA, pooledAmountB] = [
    new Decimal(amountA.amount.toString()).div(10 ** poolInfo.mintA.decimals).toString(),
    new Decimal(amountB.amount.toString()).div(10 ** poolInfo.mintB.decimals).toString(),
  ];

  const [tickLowerArrayAddress, tickUpperArrayAddress] = [
    TickUtils.getTickArrayAddressByTick(
      new PublicKey(poolInfo.programId),
      new PublicKey(poolInfo.id),
      position.tickLower,
      poolInfo.config.tickSpacing
    ),
    TickUtils.getTickArrayAddressByTick(
      new PublicKey(poolInfo.programId),
      new PublicKey(poolInfo.id),
      position.tickUpper,
      poolInfo.config.tickSpacing
    ),
  ];
  const tickArrayRes = await this.connection.getMultipleAccountsInfo([tickLowerArrayAddress, tickUpperArrayAddress]);
  if (!tickArrayRes[0] || !tickArrayRes[1]) throw new Error('Tick data not found');
  const tickArrayLower = TickArrayLayout.decode(tickArrayRes[0].data);
  const tickArrayUpper = TickArrayLayout.decode(tickArrayRes[1].data);
  const tickLowerState = tickArrayLower.ticks[TickUtils.getTickOffsetInArray(position.tickLower, poolInfo.config.tickSpacing)];
  const tickUpperState = tickArrayUpper.ticks[TickUtils.getTickOffsetInArray(position.tickUpper, poolInfo.config.tickSpacing)];

  const rpcPoolData = await this.raydium.clmm.getRpcClmmPoolInfo({ poolId: position.poolId });
  const tokenFees = PositionUtils.GetPositionFeesV2(rpcPoolData, position, tickLowerState, tickUpperState);
  const [tokenFeeAmountA, tokenFeeAmountB] = [
    tokenFees.tokenFeeAmountA.gte(new BN(0)) && tokenFees.tokenFeeAmountA.lt(U64_IGNORE_RANGE)
      ? tokenFees.tokenFeeAmountA
      : new BN(0),
    tokenFees.tokenFeeAmountB.gte(new BN(0)) && tokenFees.tokenFeeAmountB.lt(U64_IGNORE_RANGE)
      ? tokenFees.tokenFeeAmountB
      : new BN(0),
  ];
  const [feeAmountA, feeAmountB] = [
    new Decimal(tokenFeeAmountA.toString()).div(10 ** poolInfo.mintA.decimals).toNumber(),
    new Decimal(tokenFeeAmountB.toString()).div(10 ** poolInfo.mintB.decimals).toNumber(),
  ];

  const rewards = PositionUtils.GetPositionRewardsV2(rpcPoolData, position, tickLowerState, tickUpperState);
  const rewardInfos = rewards.map((r) => (r.gte(new BN(0)) && r.lt(U64_IGNORE_RANGE) ? r : new BN(0)));
  const poolRewardInfos = rewardInfos
    .map((r, idx) => {
      const rewardMint = poolInfo.rewardDefaultInfos.find(
        (r) => r.mint.address === rpcPoolData.rewardInfos[idx].tokenMint.toBase58()
      )?.mint;
      if (!rewardMint) return undefined;
      return {
        mint: rewardMint,
        amount: new Decimal(r.toString()).div(10 ** rewardMint.decimals).toNumber(),
      };
    })
    .filter(Boolean) as { mint: ApiV3Token; amount: number }[];

  const feeARewardIdx = poolRewardInfos.findIndex((r) => r.mint.address === poolInfo.mintA.address);
  if (feeARewardIdx >= 0) poolRewardInfos[feeARewardIdx].amount += feeAmountA;
  else poolRewardInfos.push({ mint: poolInfo.mintA, amount: feeAmountA });
  const feeBRewardIdx = poolRewardInfos.findIndex((r) => r.mint.address === poolInfo.mintB.address);
  if (feeBRewardIdx >= 0) poolRewardInfos[feeBRewardIdx].amount += feeAmountB;
  else poolRewardInfos.push({ mint: poolInfo.mintB, amount: feeAmountB });

  const symbolA = poolInfo.mintA.symbol === 'WSOL' ? 'SOL' : poolInfo.mintA.symbol;
  const symbolB = poolInfo.mintB.symbol === 'WSOL' ? 'SOL' : poolInfo.mintB.symbol;

  const prices = await this.getTokenPrices(`${symbolA},${symbolB}`);
  const priceA = prices[symbolA] || 0;
  const priceB = prices[symbolB] || 0;

  const feesValueA = feeAmountA * priceA;
  const feesValueB = feeAmountB * priceB;
  const totalFeesValue = feesValueA + feesValueB;

  const currentPositionValueA = Number(pooledAmountA) * priceA;
  const currentPositionValueB = Number(pooledAmountB) * priceB;
  const currentPositionValue = currentPositionValueA + currentPositionValueB;

  const positionRecord = await this.positionRepository.findOne({ where: { positionId: nftMint } });
  if (!positionRecord) throw new Error('Initial position data not found');
  const initialPositionValue = positionRecord.initialValue;
  const transactionCosts = positionRecord.transactionCosts || 0;

  const positionValueChange = currentPositionValue - initialPositionValue;
  const grossProfit = totalFeesValue + positionValueChange;
  const netProfit = grossProfit - transactionCosts;
  
  let profitability = 0;
  if (initialPositionValue > 0) {
    profitability = (netProfit / initialPositionValue) * 100;
  }

  const positionInfo: PositionInfo = {
    positionId: positionNftMint.toBase58(),
    baseAmount: pooledAmountA,
    quoteAmount: pooledAmountB,
    priceRange: {
      lower: Number(priceLower.price),
      upper: Number(priceUpper.price),
    },
    currentPrice: rpcPoolData.currentPrice,
    profitability: profitability,
    actionHistory: [
      `Collected Fees: ${feeAmountA.toFixed(6)} ${poolInfo.mintA.symbol} (${feesValueA.toFixed(2)} USD)`,
      `Collected Fees: ${feeAmountB.toFixed(6)} ${poolInfo.mintB.symbol} (${feesValueB.toFixed(2)} USD)`,
    ],
    poolKeys: { id: position.poolId.toBase58() },
  };

  const poolInfoResponse: PoolInfo = {
    poolId: position.poolId.toBase58(),
    baseMint: poolInfo.mintA.symbol,
    quoteMint: poolInfo.mintB.symbol,
    currentPrice: rpcPoolData.currentPrice,
  };

  return { position: positionInfo, pool: poolInfoResponse };
}

async currentOrderSettings() {
  try {
    const response = await axios.get(`http://${process.env.FUTURES_HOST}/order-settings`);
    return response.data;
  } catch (error) {
    console.error(`Failed to notify futures service: ${error.message}`);
    // Не прерываем выполнение, так как основная операция уже выполнена
  }
}
async setOrderSettings(orderSettings: OrderSetting[], initialAmount: string) {
  try {
    const response = await axios.post(`http://${process.env.FUTURES_HOST}/order-settings`, {
      orderSettings,
      initialAmount,
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to notify futures service: ${error.message}`);
    // Не прерываем выполнение, так как основная операция уже выполнена
  }
}

async startBinance() {
  try {
    const response = await axios.post(`http://${process.env.FUTURES_HOST}/futures/start`);
    return response.data;
  } catch (error) {
    console.error(`Failed to notify futures service: ${error.message}`);
    // Не прерываем выполнение, так как основная операция уже выполнена
  }
}

async stopBinance() {
  try {
    const response = await axios.post(`http://${process.env.FUTURES_HOST}/futures/stop`);
    return response.data;
  } catch (error) {
    console.error(`Failed to notify futures service: ${error.message}`);
    // Не прерываем выполнение, так как основная операция уже выполнена
  }
}

  async monitorPosition(positionId: string, priceRange: { lower: number; upper: number }): Promise<void> {
    throw new Error('Not implemented');
  }

  async setupLiquidityPosition_Test(params: UserParams) {
    console.log(`[TEST MODE] Received setup request for pool ${params.poolId}`);

    if (!params.hedgePlan || !params.hedgePlan.legs || params.hedgePlan.legs.length === 0) { // <-- Добавлена проверка на legs
        throw new Error('[TEST MODE] Hedge plan is missing or invalid in the request.', HttpStatus.BAD_REQUEST);
    }
    
    const hedgePlan = params.hedgePlan;
    // ИЗВЛЕКАЕМ ДАННЫЕ ИЗ ПЕРВОЙ "НОГИ"
    const gridLeg = hedgePlan.legs[0]; 
    const positionId = `test-solana-pos-${Date.now()}`;
    
    const position = this.positionRepository.create({
        positionId,
        poolId: params.poolId,
        hedgeExchange: params.exchange,
        initialBaseAmount: params.inputAmount.toString(),
        initialQuoteAmount: "0",
        // hedgePlan.currentPrice больше нет, можно использовать середину диапазона
        initialPriceA: (gridLeg.range.upper + gridLeg.range.lower) / 2, 
        initialPriceB: 1,
        initialValue: hedgePlan.totalValue,
        startPrice: gridLeg.range.lower,  // <-- ИСПРАВЛЕНО
        endPrice: gridLeg.range.upper,    // <-- ИСПРАВЛЕНО
        hedgePlan: hedgePlan,  
    });
    await this.positionRepository.save(position);
    console.log(`[TEST MODE] Saved fake position ${positionId} to DB.`);

    try {
        // Для эндпоинта start-simulation достаточно передать positionId и hedgePlan
        const payload = {
          positionId: positionId,
          hedgePlan: hedgePlan,
        };
        
        console.log(`[TEST MODE] Notifying futures service to START SIMULATION with data:`, payload);
        // Эндпоинт в binance.controller ожидает только positionId и hedgePlan, так что payload корректен
        const exchangePrefix = params.exchange;
        const futuresHost = this.configService.get<string>('FUTURES_HOST');
        await axios.post(`http://${futuresHost}/${exchangePrefix}/hedging/start-simulation`, payload);
        console.log('[TEST MODE] Successfully notified futures service to start SIMULATION.');

    } catch (error) {
        console.error(`[TEST MODE] Failed to notify futures service: ${error.response?.data?.message || error.message}`);
        await this.positionRepository.delete({ positionId: positionId });
        throw new Error(`[TEST MODE] Binance Bot notification failed.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return { status: 'success (TEST MODE)', mint: positionId, txId: 'fake-tx-id-start' };
  }

  async closePosition_Test(nftMint: string) {
    console.log(`[TEST MODE] Attempting to close position: ${nftMint}`);

    const positionRecord = await this.positionRepository.findOne({ where: { positionId: nftMint } });
    if (!positionRecord) {
        throw new Error(`[TEST MODE] Position ${nftMint} not found in database`, HttpStatus.NOT_FOUND);
    }
    
    console.log(`[TEST MODE] Skipping on-chain transaction for closing position.`);

    try {
        const payload = { positionId: nftMint };
        const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(nftMint); // <-- ДОБАВЛЕНО
        
        console.log(`[TEST MODE] Notifying futures service (${exchangePrefix}) to stop hedging for position: ${nftMint}`);
        await axios.post(`http://${futuresHost}/${exchangePrefix}/hedging/stop`, payload); // <-- ИЗМЕНЕНО
        console.log('[TEST MODE] Successfully notified futures service to stop hedging.');
    } catch (error) {
        console.error(`[TEST MODE] Failed to notify futures service about closing position ${nftMint}: ${error.message}`);
    }

    await this.positionRepository.delete({ positionId: nftMint });
    console.log(`[TEST MODE] Fake position ${nftMint} removed from database.`);
    return { txId: 'fake-tx-id-close', success: true };
  }

  async getPositionDetails(positionId: string) {
    console.log(`Fetching details for position: ${positionId}`);
    
    // 1. Находим запись о позиции в нашей базе данных
    const positionRecord = await this.positionRepository.findOne({ where: { positionId } });
    if (!positionRecord) {
        throw new Error(`Position ${positionId} not found in our database.`, HttpStatus.NOT_FOUND);
    }

    try {
        // 2. Вызываем приватный метод, чтобы получить детали хеджа с нужной биржи
        const hedgeDetails = await this.fetchHedgeDetails(positionId);
        
        // 3. Объединяем данные из БД и данные о хедже
        return {
            ...positionRecord,
            hedgeDetails: hedgeDetails,
        };

    } catch (error) {
        console.error(`Failed to fetch hedge details for ${positionId} from futures-service: ${error.message}`);
        
        // Обрабатываем случай, когда хедж-сервис вернул ошибку 404 (не найдено)
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return {
                ...positionRecord,
                hedgeDetails: null,
                error: "Hedge position info not found on the futures service. It might have been cleared or not created."
            }
        }
        
        // В случае других ошибок пробрасываем общую ошибку сервера
        throw new Error("Could not fetch details from the futures service.", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getAllActiveForHedging() {
    console.log('Fetching data for ALL active positions...');
    const allPositions = await this.positionRepository.find();
    
    return allPositions.map(pos => {
      // Проверяем, есть ли у позиции сохраненный план
      if (pos.hedgePlan && typeof pos.hedgePlan === 'object' && Object.keys(pos.hedgePlan).length > 0) {
          // ДЛЯ НОВЫХ ПОЗИЦИЙ: возвращаем ID и сохраненный план
          console.log(`Position ${pos.positionId} has a saved plan. Exporting it.`);
          return {
              positionId: pos.positionId,
              hedgePlan: pos.hedgePlan,
          };
      } else {
          // ДЛЯ СТАРЫХ ПОЗИЦИЙ: возвращаем старый набор данных для пересчета
          console.warn(`Position ${pos.positionId} does NOT have a saved plan. Exporting data for fallback recalculation.`);
          
          // Эта логика взята из вашей старой версии файла
          const DUMMY_PERCENT = 0.10; // 10%
          const startPrice = pos.startPrice || pos.initialPriceA * (1 - DUMMY_PERCENT);
          const endPrice = pos.endPrice || pos.initialPriceA * (1 + DUMMY_PERCENT);

          return {
            positionId: pos.positionId,
            pairName: 'SOL/USDT', 
            totalValue: pos.initialValue.toString(),
            range: {
                lower: startPrice.toString(),
                upper: endPrice.toString(),
            },
          };
        }
    });
  }

  async getActiveWallet(): Promise<{ publicKey: string }> {
    try {
      const owner = await this.getOwnerKeypair();
      return { publicKey: owner.publicKey.toBase58() };
    } catch (error) {
 
      if (error instanceof Error && error.getStatus() === HttpStatus.UNAUTHORIZED) {
        return { publicKey: null };
      }
 
      throw error;
    }
  }

  async getHedgePreview(params: {
    strategyType: 'GRID' | 'DUAL_GRID',
    pairName: string,
    legs: {
        binancePairSymbol: string,
        baseMint: string,
        // Каждая "нога" теперь имеет свои собственные параметры
        inputAmount: number,
        priceRangePercent: number,
    }[]
  }) {
    // 1. Собираем символы для запроса цен всех "ног" одним вызовом
    const symbolsToFetch = params.legs.map(leg => leg.baseMint).join(',');
    const prices = await this.getTokenPrices(symbolsToFetch);

    let totalValue = 0;
    const calculationLegs: any[] = [];

    // 2. Итерируемся по "ногам" и вычисляем параметры для каждой индивидуально
    for (const leg of params.legs) {
        const currentPrice = prices[leg.baseMint];
        if (!currentPrice) {
            throw new Error(`Could not fetch price for base asset ${leg.baseMint}`, HttpStatus.SERVICE_UNAVAILABLE);
        }

        // Вычисляем стоимость, исходя из ИНДИВИДУАЛЬНОГО inputAmount этой "ноги"
        const valueForLeg = leg.inputAmount * currentPrice;
        totalValue += valueForLeg;
        
        // Используем ИНДИВИДУАЛЬНЫЙ priceRangePercent для расчета диапазона
        const percent = leg.priceRangePercent / 100;
        const lowerPrice = currentPrice * (1 - percent);
        const upperPrice = currentPrice * (1 + percent);
        
        calculationLegs.push({
            binanceSymbol: leg.binancePairSymbol,
            range: {
                lower: lowerPrice.toString(),
                upper: upperPrice.toString(),
            },
            // Передаем кастомные значения, если они нужны в binance-service
            // (пока не используются, но это хороший задел на будущее)
            customBaseHedgeAmount: leg.inputAmount, 
            customLeverage: 0, // Или другое значение по умолчанию
        });
    }

    try {
        const binanceServiceHost = this.configService.get<string>('FUTURES_HOST');
        
        // 3. Формируем тело запроса в binance-service
        const payload = {
            strategyType: params.strategyType,
            totalValue: totalValue.toString(),
            pairName: params.pairName,
            legs: calculationLegs,
        };

        console.log(`[DIAGNOSTIC] Sending to calculate-plan with totalValue: ${payload.totalValue}`);
        
        const response = await axios.post(
            `http://${binanceServiceHost}/binance/hedging/calculate-plan`,
            payload,
        );
        return response.data;

    } catch (error) {
        console.error('Failed to get hedge preview from binance-service', error.response?.data || error.message);
        throw new Error(
            error.response?.data?.message || 'Could not calculate hedge plan.',
            error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
  }

  async recalculateHedgePlan(positionId: string, plan: any): Promise<any> {
    try {
        const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(positionId);
        const response = await axios.post(
            `http://${futuresHost}/${exchangePrefix}/hedging/recalculate-plan`,
            plan
        );
        return response.data;
    } catch (error) {
        console.error('Failed to get recalculated hedge plan from futures-service', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Could not recalculate hedge plan.', error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getValidPairs(): Promise<ValidPair[]> {
    console.log('Fetching valid pairs from the local raydium-pools.json file.');
    const filePath = path.join(__dirname, '..', '..', 'raydium-pools.json');

    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        // Типизируем данные, которые читаем из файла
        const configuredPools: ValidPair[] = JSON.parse(fileContent);

        // Преобразование больше не нужно, формат уже совпадает с интерфейсом
        console.log(`Successfully loaded ${configuredPools.length} pairs from the config file.`);
        return configuredPools;

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error('CRITICAL ERROR: raydium-pools.json not found.');
        } else {
            console.error(`A critical error occurred while reading the pools file: ${error.message}`);
        }
        return [];
    }
  }

  async getFuturesAccountBalance(exchange: 'binance' | 'bybit') {
    try {
        const futuresHost = this.configService.get<string>('FUTURES_HOST');
        // Путь теперь динамический
        const response = await axios.get(`http://${futuresHost}/${exchange}/account/balance`);
        return response.data;
    } catch (error) {
        console.error(`Failed to get balance from ${exchange}-service: ${error.message}`);
        throw new Error(`Could not retrieve ${exchange} balance.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async enableRebalance(positionId: string): Promise<void> {
    const position = await this.positionRepository.findOne({ where: { positionId } });
    if (!position) {
        throw new Error(`Position ${positionId} not found`, HttpStatus.NOT_FOUND);
    }

    position.isAutoRebalancing = true;
    await this.positionRepository.save(position);
    console.log(`Position ${positionId} successfully marked for rebalancing in DB.`);

    // Отправляем команду на старт микросервису
    try {
        const rebalancerHost = this.configService.get<string>('REBALANCER_HOST'); // e.g., http://localhost:3001
        await axios.post(`http://${rebalancerHost}/rebalance/start`, {
            positionId: positionId,
        });
        console.log(`Successfully sent start command to rebalancer for position ${positionId}.`);
    } catch (error) {
        console.error(`Failed to send start command to rebalancer for ${positionId}:`, error.message);
        // Можно откатить флаг в БД или просто записать ошибку
        position.isAutoRebalancing = false;
        await this.positionRepository.save(position);
        throw new Error('Could not communicate with the rebalancer service.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async disableRebalance(positionId: string): Promise<void> {
    const position = await this.positionRepository.findOne({ where: { positionId } });
    if (!position) {
        throw new Error(`Position ${positionId} not found`, HttpStatus.NOT_FOUND);
    }

    position.isAutoRebalancing = false;
    await this.positionRepository.save(position);
    console.log(`Position ${positionId} successfully unmarked for rebalancing in DB. Worker will stop automatically.`);
  }

  async handleRebalanceCompletion(data: RebalanceCompletionData): Promise<void> {
    const { oldPositionId, newPositionData, fees } = data;
    console.log(`Handling rebalance completion: OLD ${oldPositionId} -> NEW ${newPositionData.positionId}`);

    const oldPosition = await this.positionRepository.findOne({ where: { positionId: oldPositionId } });
    if (!oldPosition) {
        this.logger.warn(`[Rebalance] Callback for a non-existent old position ${oldPositionId}. Cannot proceed.`);
        return;
    }

    try {
        const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(oldPositionId); // <-- ДОБАВЛЕНО
        await axios.post(`http://${futuresHost}/${exchangePrefix}/hedging/remap`, { // <-- ИЗМЕНЕНО
            oldPositionId: oldPositionId,
            newPositionId: newPositionData.positionId,
        });
        console.log(`[Rebalance] Successfully notified ${exchangePrefix}-service to remap hedge key.`);
    } catch (error) {
        console.error(`[CRITICAL] Failed to remap hedge in futures-service for ${oldPositionId}. The hedge might be orphaned.`, error.message);
    }

    await this.positionRepository.delete({ positionId: oldPositionId });
    console.log(`[Rebalance] Old position record ${oldPositionId} has been deleted.`);

    // 4. Создаем новую запись, перенося в нее существующий план хеджирования
    const totalRebalanceCost = (fees.closeOldPositionFeeUSD || 0) + (fees.openNewPositionFeeUSD || 0);

    const positionToSave = {
        ...newPositionData,
        hedgePlan: oldPosition.hedgePlan, // Переносим план
        transactionCosts: totalRebalanceCost, // <-- ЗАПИСЫВАЕМ СУММАРНЫЕ ЗАТРАТЫ
        isAutoRebalancing: true,
    };
    const savedPosition = await this.positionRepository.save(positionToSave);

    console.log(`[Rebalance] New position record ${savedPosition.positionId} created with total rebalance cost of ${totalRebalanceCost.toFixed(4)} USD.`);

    try {
      const rebalancerHost = this.configService.get<string>('REBALANCER_HOST');
      if (rebalancerHost) {
          console.log(`[Rebalance] Sending START command to rebalancer for new position: ${savedPosition.positionId}`);
          await axios.post(`http://${rebalancerHost}/rebalance/start`, {
              positionId: savedPosition.positionId,
          });
          console.log(`[Rebalance] Successfully sent start command to rebalancer.`);
      } else {
          this.logger.warn('[Rebalance] REBALANCER_HOST is not configured. Cannot send start command.');
      }
    } catch (error) {
        console.error(`[CRITICAL] Failed to send START command to rebalancer for new position ${savedPosition.positionId}.`, error.message);
        // Ошибка здесь критична, так как автоматическое отслеживание не начнется без перезапуска.
        // Можно добавить систему оповещений для таких случаев.
    }
  }

  async getChartData(poolId: string, resolution: string, from: number, to: number): Promise<any> {
      console.log(`Requesting chart data for pool ${poolId} from GeckoTerminal`);

      const timeframeMap = {
          '15M': { unit: 'minute', aggregate: 15 },
          '1H':  { unit: 'hour',   aggregate: 1 },
          '4H':  { unit: 'hour',   aggregate: 4 },
          '1D':  { unit: 'day',    aggregate: 1 },
      };
      
      const apiParams = timeframeMap[resolution] || timeframeMap['1H'];
      const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolId}/ohlcv/${apiParams.unit}`;

      try {
          const response = await axios.get(url, {
              // --- КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: ДОБАВЛЯЕМ ТАЙМ-АУТ ---
              timeout: 15000, // Ждем не более 15 секунд (15000 миллисекунд)
              // -------------------------------------------------
              params: {
                  aggregate: apiParams.aggregate,
                  limit: 1000,
                  start_timestamp: from,
                  end_timestamp: to,
              },
              headers: {
                  'Accept': 'application/json;version=20240301'
              }
          });

          // Эта часть кода теперь будет выполняться только если ответ пришел вовремя
          console.log(`Received response from GeckoTerminal for pool ${poolId}`);
          const ohlcvList = response.data?.data?.attributes?.ohlcv_list;
          
          if (!ohlcvList || ohlcvList.length === 0) {
              this.logger.warn(`No chart data returned from GeckoTerminal for pool ${poolId}`);
              return [];
          }
          
          console.log(`Processing ${ohlcvList.length} candles...`);
          return ohlcvList.map(candle => ({
              time: candle[0],
              open: candle[1],
              high: candle[2],
              low: candle[3],
              close: candle[4],
              volume: candle[5],
          }));

      } catch (error) {
          // Теперь мы будем ловить ошибку тайм-аута здесь
          if (error.code === 'ECONNABORTED') {
              console.error(`Request to GeckoTerminal timed out for pool ${poolId}`);
          } else {
              const errorDetails = error.response?.data?.errors?.[0]?.title || error.message;
              console.error(`Failed to fetch chart data from GeckoTerminal for pool ${poolId}: ${errorDetails}`);
          }
          
          throw new Error(
              'Chart data provider did not respond in time.',
              HttpStatus.GATEWAY_TIMEOUT, // Используем более подходящий статус ошибки
          );
      }
  }


  async updateHedgeState(positionId: string, state: any): Promise<Position> {
    const position = await this.positionRepository.findOne({ where: { positionId } });
    if (!position) {
        throw new Error('Position not found', HttpStatus.NOT_FOUND);
    }
    position.hedgePlan = state;
    return this.positionRepository.save(position);
  }

  async fetchAllPositionsWithDetails(): Promise<any[]> {
    console.log('Fetching all user positions with full details (BATCHED)...');
    const owner = await this.getOwnerKeypair();
    await this.initialize(owner);

    const positionRecords = await this.positionRepository.find();
    if (!positionRecords || positionRecords.length === 0) {
        return [];
    }

    const realPositionRecords = positionRecords.filter(p => !p.positionId.startsWith('test-'));
    const positionKeys = realPositionRecords.map(record =>
        getPdaPersonalPositionAddress(CLMM_PROGRAM_ID, new PublicKey(record.positionId)).publicKey
    );

    console.log(`Fetching ${positionKeys.length} position accounts in a single batch request...`);
    const positionAccounts = await this.raydium.connection.getMultipleAccountsInfo(positionKeys);

    const positionAccountMap = new Map<string, any>();
    positionAccounts.forEach((account, index) => {
        if (account) {
            positionAccountMap.set(realPositionRecords[index].positionId, PositionInfoLayout.decode(account.data));
        }
    });
    
    const positionsWithDetails = await Promise.all(
        positionRecords.map(async (record) => {
            try {
                if (record.positionId.startsWith('test-')) {
                    const testDetails = await this.fetchHedgeDetails(record.positionId);
                    return { ...record, profitability: 0, details: testDetails };
                }
                
                const positionData = positionAccountMap.get(record.positionId);
                
                if (!positionData) {
                    this.logger.warn(`[GHOST DETECTED] Position ${record.positionId} is in DB but not on-chain. Hiding from frontend.`);
                    return null;
                }

                const poolInfo = (await this.raydium.api.fetchPoolById({ ids: positionData.poolId.toBase58() }))[0] as ApiV3PoolInfoConcentratedItem;
                
                const { amountA, amountB } = PositionUtils.getAmountsFromLiquidity({
                    poolInfo,
                    ownerPosition: positionData,
                    liquidity: positionData.liquidity,
                    slippage: 0, add: false,
                    epochInfo: await this.connection.getEpochInfo(),
                });

                const symbolA = poolInfo.mintA.symbol === 'WSOL' ? 'SOL' : poolInfo.mintA.symbol;
                const symbolB = poolInfo.mintB.symbol === 'WSOL' ? 'SOL' : poolInfo.mintB.symbol;
                const prices = await this.getTokenPrices(`${symbolA},${symbolB}`);
                const priceA = new Decimal(prices[symbolA] || 0);
                const priceB = new Decimal(prices[symbolB] || 0);

                const pooledAmountA = new Decimal(amountA.amount.toString()).div(10 ** poolInfo.mintA.decimals);
                const pooledAmountB = new Decimal(amountB.amount.toString()).div(10 ** poolInfo.mintB.decimals);
                
                const currentPositionValue = pooledAmountA.mul(priceA).add(pooledAmountB.mul(priceB));
                const initialPositionValue = new Decimal(record.initialValue);
                const transactionCosts = new Decimal(record.transactionCosts || 0);
                
                let profitability = new Decimal(0);
                if (initialPositionValue.gt(0)) {
                    const valueChange = currentPositionValue.sub(initialPositionValue);
                    const netProfit = valueChange.sub(transactionCosts);
                    profitability = netProfit.div(initialPositionValue).mul(100);
                }

                const combinedData = {
                    ...record,
                    baseAmount: pooledAmountA.toString(),
                    quoteAmount: pooledAmountB.toString(),
                    priceRange: {
                        lower: TickUtils.getTickPrice({ poolInfo, tick: positionData.tickLower, baseIn: true }).price.toNumber(),
                        upper: TickUtils.getTickPrice({ poolInfo, tick: positionData.tickUpper, baseIn: true }).price.toNumber(),
                    },
                    currentPrice: poolInfo.price,
                    profitability: profitability.toNumber(),  
                    details: await this.fetchHedgeDetails(record.positionId),
                };
                return combinedData;

            } catch (error) {
                console.error(`Could not process position ${record.positionId} in batch: ${error.message}`);
                return { ...record, details: { error: `Failed to process position.` } };
            }
        })
    );
    
    const validPositions = positionsWithDetails.filter(p => p !== null);
    console.log(`Successfully processed and filtered ${validPositions.length} positions.`);
    return validPositions;
  }

  private async fetchHedgeDetails(positionId: string): Promise<any> {
    try {
        const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(positionId);

        const requestUrl = `http://${futuresHost}/${exchangePrefix}/hedging/status/${positionId}`;
        console.log(`Fetching hedge details from: ${requestUrl}`);

        const response = await axios.get(requestUrl);
        return response.data;
    } catch (error) {
        console.error(`[fetchHedgeDetails] Failed for position ${positionId}: ${error.message}`);

        if (axios.isAxiosError(error)) {
            throw error;
        }

        return { error: "Hedge details not found or service is unavailable." };
    }
  }

  async getAutomatedRange(poolId: string, initialLpValueUsd: number) {
    console.log(`Proxying automated range request to analytics service for pool ${poolId}`);
    const targetUrl = `${this.analyticsServiceHost}/api/v3/hedge-breakeven-range`;
    try {
        const response = await axios.get(targetUrl, {
            params: {
                pool_id: poolId,
                initial_lp_value_usd: initialLpValueUsd,
                hedge_ratio: 0.2,
                time_to_edge_days: 7,
            },
            timeout: 15000, 
        });
        
        console.log(`Successfully received automated range from analytics service for pool ${poolId}`);
        return response.data;

    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMsg = error.response?.data?.detail || error.message;
            const statusCode = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
            console.error(`Error from analytics service: [${statusCode}] ${errorMsg}`);
            throw new Error(errorMsg, statusCode);
        }
        
        console.error('An unknown error occurred while calling the analytics service', error);
        throw new Error('Failed to communicate with the range analytics service.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getHighAprPools(): Promise<any> {
    console.log(`Proxying request to scanner service at ${this.scannerHost}`);
    try {
      const response = await axios.get(`${this.scannerHost}/api/high-apr-pools`, {
        timeout: 5000, 
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Failed to connect to scanner service: ${error.message}`);
        return [];
      }
      console.error('An unknown error occurred while proxying to scanner.', error);
      throw new Error('Could not retrieve data from the scanner service.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async startHedgeSimulationForExisting(params: any): Promise<any> {
    console.log(`[SIMULATION] Starting hedge simulation for existing position: ${params.positionId}`);
    try {
        const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfig(params.positionId);
        let endpoint: string;

        if (params.legs && Array.isArray(params.legs) && params.legs.length > 0) {
            console.log(`[SIMULATION] Detected DUAL-LEG (volatile/volatile) simulation request.`);
            endpoint = 'hedging/start-delta-neutral-simulation';
        } else {
            console.log(`[SIMULATION] Detected SINGLE-LEG (volatile/stable) simulation request.`);
            endpoint = 'hedging/start-delta-neutral-simulation'; 
        }
        
        const targetUrl = `http://${futuresHost}/${exchangePrefix}/${endpoint}`;
        const response = await axios.post(targetUrl, params);
        
        return response.data;
    } catch (error) {
        console.error(`Failed to start simulation for existing position: ${error.message}`);
        throw new Error('Could not start simulation on the hedging service.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async getFuturesServiceConfig(positionId: string): Promise<{ futuresHost: string; exchangePrefix: string }> {
    const position = await this.positionRepository.findOne({ where: { positionId } });
    const exchange = position?.hedgeExchange || 'binance'; 
    const hostEnvVariable = exchange === 'bybit' ? 'BYBIT_FUTURES_HOST' : 'BINANCE_FUTURES_HOST';
    const futuresHost = this.configService.get<string>(hostEnvVariable);
    if (!futuresHost) {
        throw new Error(`Host for ${exchange} (${hostEnvVariable}) is not configured in .env`);
    }
    return {
        futuresHost,
        exchangePrefix: exchange,
    };
  }

  async validateDeltaNeutralValue(params: DeltaNeutralValidationBody): Promise<{ isValid: boolean; message: string }> {
    console.log(`[Validation] Received request for ${params.exchange} with value ${params.totalValue}`);
    try {
      const { futuresHost, exchangePrefix } = await this.getFuturesServiceConfigForExchange(params.exchange);
      // Мы создадим этот новый эндпоинт в binance/bybit контроллерах
      await axios.post(`http://${futuresHost}/${exchangePrefix}/hedging/validate-value`, {
        totalValue: params.totalValue,
        legs: params.legs,
      });
      // Если запрос прошел без ошибок, значит, сумма валидна
      return { isValid: true, message: 'OK' };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        // Возвращаем текст ошибки, который прислал сервис (например, "The entered amount does not meet...")
        return { isValid: false, message: error.response.data.message };
      }
      // Общая ошибка, если сервис недоступен
      return { isValid: false, message: 'Could not connect to the hedging service for validation.' };
    }
  }

  private async getFuturesServiceConfigForExchange(exchange: 'binance' | 'bybit'): Promise<{ futuresHost: string; exchangePrefix: string }> {
    const hostEnvVariable = exchange === 'bybit' ? 'BYBIT_FUTURES_HOST' : 'BINANCE_FUTURES_HOST';
    const futuresHost = this.configService.get<string>(hostEnvVariable);
    if (!futuresHost) {
        throw new Error(`Host for ${exchange} (${hostEnvVariable}) is not configured in .env`);
    }
    return {
        futuresHost,
        exchangePrefix: exchange,
    };
  }
  
}