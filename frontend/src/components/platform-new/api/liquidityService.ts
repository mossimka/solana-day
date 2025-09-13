import axiosInstance from "@/lib/axios";
import type {
  BalanceResponse,
  FullHedgePlan,
  HedgePlanUpdatePayload,
  PositionWithDetails,
  ValidPair,
  AutomatedRangeResponse,
  SetupPayload,
  DeltaNeutralValidationResponse,
  Exchange,
} from "../types";

// Centralized API layer for liquidity platform interactions

export const liquidityApi = {
  getPositionsWithDetails: () =>
    axiosInstance.get<PositionWithDetails[]>(
      "/liquidity/positions-with-details"
    ),
  getActiveWallet: () =>
    axiosInstance.get<{ publicKey: string | null }>("/liquidity/active-wallet"),
  getFuturesBalance: (exchange: Exchange) =>
    axiosInstance.get(`/liquidity/futures/balance/${exchange}`),
  savePrivateKey: (privateKey: string) =>
    axiosInstance.post("/liquidity/private-key", { privateKey }),
  getPoolBalances: (poolId: string) =>
    axiosInstance.get<BalanceResponse>(`/liquidity/pool/balance/${poolId}`),
  getTokenPrices: (symbols: string[]) =>
    axiosInstance.get<Record<string, number>>("/liquidity/token/price", {
      params: { symbols: symbols.join(",") },
    }),
  getHedgePreview: (payload: any) =>
    axiosInstance.post<FullHedgePlan>("/liquidity/hedge-preview", payload),
  recalcPlan: (plan: HedgePlanUpdatePayload) =>
    axiosInstance.post<FullHedgePlan>("/liquidity/recalculate-plan", plan),
  getHighAprPools: () => axiosInstance.get("/liquidity/high-apr-pools"),
  getValidPairs: () => axiosInstance.get<ValidPair[]>("/liquidity/valid-pairs"),
  setupPosition: (payload: SetupPayload, test?: boolean) =>
    axiosInstance.post(
      test ? "/liquidity/setup-position-test" : "/liquidity/setup-position",
      payload
    ),
  closePosition: (nftMint: string, test?: boolean) =>
    axiosInstance.post(
      test ? "/liquidity/close-position-test" : "/liquidity/close-position",
      { nftMint }
    ),
  toggleRebalance: (positionId: string, enable: boolean) =>
    axiosInstance.post(
      `/liquidity/positions/${positionId}/${
        enable ? "enable-rebalance" : "disable-rebalance"
      }`
    ),
  automatedRange: (poolId: string, initialLpValueUsd: number) =>
    axiosInstance.post<AutomatedRangeResponse>("/liquidity/automated-range", {
      poolId,
      initialLpValueUsd,
    }),
  validateDeltaNeutral: (totalValue: number, exchange: Exchange, legs: any[]) =>
    axiosInstance.post<DeltaNeutralValidationResponse>(
      "/liquidity/validate-delta-neutral",
      { totalValue, exchange, legs }
    ),
};
