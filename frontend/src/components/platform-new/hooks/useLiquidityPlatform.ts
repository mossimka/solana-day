"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { liquidityApi } from "../api/liquidityService";
import type {
  BalanceResponse,
  Exchange,
  FullHedgePlan,
  MatchResult,
  PositionWithDetails,
  StrategyType,
  ValidPair,
} from "../types";

interface UseLiquidityPlatformOptions {
  pollIntervalMs?: number;
}

export function useLiquidityPlatform({
  pollIntervalMs = 10_000,
}: UseLiquidityPlatformOptions = {}) {
  // Core state
  const [positions, setPositions] = useState<PositionWithDetails[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [balances, setBalances] = useState<BalanceResponse>({});
  const [binanceBalance, setBinanceBalance] = useState<string>("0.00");
  const [bybitBalance, setBybitBalance] = useState<string>("0.00");
  const [selectedExchange, setSelectedExchange] = useState<Exchange>("binance");
  const [selectedPool, setSelectedPool] = useState<ValidPair | null>(null);
  const [hedgePlan, setHedgePlan] = useState<FullHedgePlan | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [strategyType, setStrategyType] = useState<StrategyType>("GRID");
  const [notifications, setNotifications] = useState<MatchResult[]>([]);
  const [message, setMessage] = useState("");
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [priceRangePercent, setPriceRangePercent] = useState<number>(10);
  const [inputAmount, setInputAmount] = useState<string>("0.1");
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [usdValue, setUsdValue] = useState<number>(0);
  const [deltaNeutralWarning, setDeltaNeutralWarning] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [privateKeySaved, setPrivateKeySaved] = useState(false);
  const isRecalculating = useRef(false);

  // ---------- Fetch helpers ----------
  const fetchPositions = useCallback(async () => {
    setLoadingPositions(true);
    try {
      const { data } = await liquidityApi.getPositionsWithDetails();
      setPositions(data || []);
    } catch {
      setMessage("Failed to fetch positions");
    } finally {
      setLoadingPositions(false);
    }
  }, []);

  const pollPositions = useCallback(async () => {
    try {
      const { data } = await liquidityApi.getPositionsWithDetails();
      setPositions(data || []);
    } catch {
      /* silent */
    }
  }, []);

  const fetchActiveWallet = useCallback(async () => {
    try {
      const { data } = await liquidityApi.getActiveWallet();
      setActiveWallet(data.publicKey || null);
    } catch {
      setActiveWallet(null);
    }
  }, []);

  const fetchFuturesBalances = useCallback(async () => {
    try {
      const binance = await liquidityApi.getFuturesBalance("binance");
      const bybit = await liquidityApi.getFuturesBalance("bybit");
      const b = parseFloat(binance.data.availableBalance || "0");
      const y = parseFloat(bybit.data.walletBalance || "0");
      setBinanceBalance(isNaN(b) ? "0.00" : b.toFixed(2));
      setBybitBalance(isNaN(y) ? "0.00" : y.toFixed(2));
    } catch {
      /* ignore */
    }
  }, []);

  const fetchPoolBalances = useCallback(async (poolId: string) => {
    try {
      const { data } = await liquidityApi.getPoolBalances(poolId);
      setBalances(data);
    } catch {
      setBalances({});
    }
  }, []);

  const fetchTokenPrices = useCallback(async (symbols: string[]) => {
    if (!symbols.length) return;
    try {
      const { data } = await liquidityApi.getTokenPrices(symbols);
      setTokenPrices((prev) => ({ ...prev, ...data }));
    } catch {
      /* ignore */
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await liquidityApi.getHighAprPools();
      if (data) setNotifications(data);
    } catch {
      /* ignore */
    }
  }, []);

  // ---------- Hedge preview logic ----------
  const buildHedgePreviewPayload = useCallback(() => {
    if (!selectedPool) return null;
    const isDual = !["USDC", "USDT", "USDH"].includes(selectedPool.quoteMint);
    return {
      strategyType: (isDual ? "DUAL_GRID" : "GRID") as StrategyType,
      pairName: `${selectedPool.baseMint}/${selectedPool.quoteMint}`,
      exchange: selectedExchange,
      legs: isDual
        ? [
            {
              binancePairSymbol:
                selectedPool.baseCexSymbol || `${selectedPool.baseMint}USDT`,
              baseMint: selectedPool.baseMint,
              inputAmount: Number(inputAmount),
              priceRangePercent: Number(priceRangePercent),
            },
            {
              binancePairSymbol:
                selectedPool.quoteCexSymbol || `${selectedPool.quoteMint}USDT`,
              baseMint: selectedPool.quoteMint,
              inputAmount: Number(inputAmount),
              priceRangePercent: Number(priceRangePercent),
            },
          ]
        : [
            {
              binancePairSymbol: selectedPool.binancePairSymbol,
              baseMint: selectedPool.baseMint,
              inputAmount: Number(inputAmount),
              priceRangePercent: Number(priceRangePercent),
            },
          ],
    };
  }, [selectedPool, inputAmount, priceRangePercent, selectedExchange]);

  const fetchHedgePreview = useCallback(async () => {
    if (!selectedPool || !inputAmount || strategyType !== "GRID") {
      setHedgePlan(null);
      return;
    }
    setLoadingPreview(true);
    try {
      const payload = buildHedgePreviewPayload();
      if (!payload) return;
      const { data } = await liquidityApi.getHedgePreview(payload);
      setHedgePlan(data);
    } catch {
      setHedgePlan(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [
    selectedPool,
    inputAmount,
    strategyType,
    buildHedgePreviewPayload,
  ]);

  const recalcPlan = useCallback(async (plan: FullHedgePlan) => {
    if (isRecalculating.current) return;
    isRecalculating.current = true;
    try {
      const { data } = await liquidityApi.recalcPlan(plan);
      setHedgePlan(data);
    } finally {
      isRecalculating.current = false;
    }
  }, []);

  // ---------- Actions ----------
  const selectPool = useCallback(
    async (pool: ValidPair) => {
      setSelectedPool(pool);
      await fetchTokenPrices([pool.baseMint, pool.quoteMint]);
      await fetchPoolBalances(pool.poolId);
    },
    [fetchPoolBalances, fetchTokenPrices]
  );

  const openPairModal = () => setPairModalOpen(true);
  const closePairModal = () => setPairModalOpen(false);

  const toggleRebalance = useCallback(
    async (positionId: string, enable: boolean) => {
      setPositions((prev) =>
        prev.map((p) =>
          p.positionId === positionId ? { ...p, isAutoRebalancing: enable } : p
        )
      );
      try {
        await liquidityApi.toggleRebalance(positionId, enable);
      } catch {
        setPositions((prev) =>
          prev.map((p) =>
            p.positionId === positionId
              ? { ...p, isAutoRebalancing: !enable }
              : p
          )
        );
      }
    },
    []
  );

  const removePosition = useCallback(
    async (p: PositionWithDetails) => {
      const test = p.positionId.startsWith("test-");
      try {
        await liquidityApi.closePosition(p.positionId, test);
        await fetchPositions();
        if (selectedPool) await fetchPoolBalances(selectedPool.poolId);
      } catch {
        setMessage("Failed to remove position");
      }
    },
    [fetchPositions, fetchPoolBalances, selectedPool]
  );

  const setupPosition = useCallback(async () => {
    if (!selectedPool || !inputAmount) return;
    setIsSettingUp(true);
    try {
      if (priceRangePercent === 0) {
        const autoRange = await liquidityApi.automatedRange(
          selectedPool.poolId,
          usdValue
        );
        const sr = autoRange.data.suggestedRange;
        if (!sr) throw new Error("No automated range");
        const midpoint = (sr.lowerPrice + sr.upperPrice) / 2;
        const calculatedPercent = ((midpoint - sr.lowerPrice) / midpoint) * 100;
        const preview = await liquidityApi.getHedgePreview({
          poolId: selectedPool.poolId,
          inputAmount: Number(inputAmount),
          priceRangePercent: calculatedPercent,
        });
        const plan = preview.data;
        await liquidityApi.setupPosition(
          {
            poolId: selectedPool.poolId,
            inputAmount: Number(inputAmount),
            priceRangePercent: calculatedPercent,
            hedgePlan: plan,
            strategyType,
            exchange: selectedExchange,
          },
          isTestMode
        );
      } else {
        let planToSend: FullHedgePlan | undefined;
        if (strategyType === "GRID") planToSend = hedgePlan || undefined;
        if (strategyType === "DELTA_NEUTRAL") {
          planToSend = {
            strategyType: "DELTA_NEUTRAL",
            legs: !["USDC", "USDT", "USDH"].includes(selectedPool.quoteMint)
              ? [
                  {
                    tradingPair:
                      selectedPool.baseCexSymbol ||
                      `${selectedPool.baseMint}USDT`,
                    leverage: 1,
                    baseHedgeAmount: 0,
                    zones: [],
                  },
                  {
                    tradingPair:
                      selectedPool.quoteCexSymbol ||
                      `${selectedPool.quoteMint}USDT`,
                    leverage: 1,
                    baseHedgeAmount: 0,
                    zones: [],
                  },
                ]
              : [
                  {
                    tradingPair:
                      selectedPool.binancePairSymbol ||
                      `${selectedPool.baseMint}USDT`,
                    leverage: 1,
                    baseHedgeAmount: 0,
                    zones: [],
                  },
                ],
          } as FullHedgePlan;
        }
        await liquidityApi.setupPosition(
          {
            poolId: selectedPool.poolId,
            inputAmount: Number(inputAmount),
            priceRangePercent,
            hedgePlan: planToSend,
            strategyType,
            exchange: selectedExchange,
          },
          isTestMode
        );
      }
      await fetchPositions();
      if (selectedPool) await fetchPoolBalances(selectedPool.poolId);
    } catch (error: unknown) {
      const e = error as { message?: string };
      setMessage(e?.message || "Failed to setup position");
    } finally {
      setIsSettingUp(false);
    }
  }, [
    selectedPool,
    inputAmount,
    priceRangePercent,
    hedgePlan,
    strategyType,
    selectedExchange,
    isTestMode,
    usdValue,
    fetchPositions,
    fetchPoolBalances,
  ]);

  // Save private key
  const savePrivateKey = useCallback(
    async (key: string) => {
      setSavingKey(true);
      try {
        await liquidityApi.savePrivateKey(key);
        setPrivateKeySaved(true);
        await fetchActiveWallet();
      } catch {
        setMessage("Failed to save private key");
      } finally {
        setSavingKey(false);
      }
    },
    [fetchActiveWallet, setMessage]
  );

  // ---------- Effects ----------
  useEffect(() => {
    fetchPositions();
    fetchActiveWallet();
    fetchFuturesBalances();
    fetchNotifications();
  }, [
    fetchPositions,
    fetchActiveWallet,
    fetchFuturesBalances,
    fetchNotifications,
  ]);
  useEffect(() => {
    const id = setInterval(pollPositions, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollPositions, pollIntervalMs]);
  useEffect(() => {
    const t = setTimeout(() => fetchHedgePreview(), 400);
    return () => clearTimeout(t);
  }, [fetchHedgePreview]);
  useEffect(() => {
    if (inputAmount && selectedPool) {
      const p = tokenPrices[selectedPool.baseMint];
      setUsdValue(p ? Number(inputAmount) * p : 0);
    }
  }, [inputAmount, selectedPool, tokenPrices]);
  useEffect(() => {
    if (!hedgePlan || !hedgePlan.legs?.length || isRecalculating.current)
      return;
    const t = setTimeout(() => recalcPlan(hedgePlan), 750);
    return () => clearTimeout(t);
  }, [hedgePlan, recalcPlan]);

  // Delta-neutral validation effect
  useEffect(() => {
    let cancelled = false;
    const validate = async () => {
      if (strategyType !== "DELTA_NEUTRAL" || !selectedPool || !inputAmount) {
        setDeltaNeutralWarning("");
        return;
      }
      try {
        // Ensure we have price for base token
        const base = selectedPool.baseMint;
        if (!tokenPrices[base]) {
          await fetchTokenPrices([base]);
        }
        const price = tokenPrices[base];
        if (!price) {
          setDeltaNeutralWarning(`No price for ${base}`);
          return;
        }
        const totalValueInUSD = Number(inputAmount) * price;
        const legs = !["USDC", "USDT", "USDH"].includes(selectedPool.quoteMint)
          ? [
              {
                tradingPair:
                  selectedPool.baseCexSymbol || `${selectedPool.baseMint}USDT`,
              },
              {
                tradingPair:
                  selectedPool.quoteCexSymbol ||
                  `${selectedPool.quoteMint}USDT`,
              },
            ]
          : [
              {
                tradingPair:
                  selectedPool.binancePairSymbol ||
                  `${selectedPool.baseMint}USDT`,
              },
            ];
        const { data } = await liquidityApi.validateDeltaNeutral(
          totalValueInUSD,
          selectedExchange,
          legs
        );
        if (cancelled) return;
        setDeltaNeutralWarning(
          data.isValid ? "" : data.message || "Value not valid"
        );
      } catch (error: unknown) {
        const e = error as { message?: string };
        if (!cancelled)
          setDeltaNeutralWarning(e?.message || "Validation failed");
      }
    };
    const t = setTimeout(validate, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    strategyType,
    selectedPool,
    inputAmount,
    selectedExchange,
    tokenPrices,
    fetchTokenPrices,
  ]);

  return {
    // state
    positions,
    loadingPositions,
    activeWallet,
    balances,
    binanceBalance,
    bybitBalance,
    selectedExchange,
    setSelectedExchange,
    selectedPool,
    hedgePlan,
    loadingPreview,
    strategyType,
    setStrategyType,
    notifications,
    message,
    setMessage,
    isSettingUp,
    isTestMode,
    setIsTestMode,
    priceRangePercent,
    setPriceRangePercent,
    inputAmount,
    setInputAmount,
    usdValue,
    deltaNeutralWarning,
    // actions
    selectPool,
    toggleRebalance,
    removePosition,
    setupPosition,
    setHedgePlan,
    savePrivateKey,
    // modal state & flags
    openPairModal,
    closePairModal,
    pairModalOpen,
    savingKey,
    privateKeySaved,
  };
}
