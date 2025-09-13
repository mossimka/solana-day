"use client";
import React, { useState } from "react";
import type { FullHedgePlan, HedgeLegPlan, StrategyType, Exchange } from "../types";
import { HedgeLegEditor } from "./HedgeLegEditor";

interface SetupLiquidityPanelProps {
  selectedPairLabel: string | null;
  onOpenPairModal: () => void;
  inputAmount: string;
  setInputAmount: (v: string) => void;
  priceRangePercent: number;
  setPriceRangePercent: (n: number) => void;
  hedgePlan: FullHedgePlan | null;
  loadingPreview: boolean;
  strategyType: string;
  setStrategyType: (s: StrategyType) => void;
  selectedExchange: string;
  setSelectedExchange: (e: Exchange) => void;
  onHedgePlanChange: (
    legIndex: number,
    field: string,
    value: string,
    zoneIndex?: number
  ) => void;
  onHedgePlanBlur: (
    legIndex: number,
    field: string,
    value: string,
    zoneIndex?: number
  ) => void;
  onSetup: () => void;
  disabled: boolean;
  isTestMode: boolean;
  setIsTestMode: (b: boolean) => void;
  deltaNeutralWarning?: string;
}

export const SetupLiquidityPanel: React.FC<SetupLiquidityPanelProps> = ({
  selectedPairLabel,
  onOpenPairModal,
  inputAmount,
  setInputAmount,
  priceRangePercent,
  setPriceRangePercent,
  hedgePlan,
  loadingPreview,
  strategyType,
  setStrategyType,
  selectedExchange,
  setSelectedExchange,
  onHedgePlanChange,
  onHedgePlanBlur,
  onSetup,
  disabled,
  isTestMode,
  setIsTestMode,
  deltaNeutralWarning,
}) => {
  const hasZeroQty =
    strategyType === "GRID" &&
    hedgePlan?.legs?.some((l: HedgeLegPlan) =>
      l.zones.some((z) => Number(z.quantity) === 0)
    );
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide">Setup Liquidity</h3>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-[10px] px-2 py-1 rounded bg-[var(--color-surface-hover)] hover:bg-[var(--color-primary)]/20 transition"
        >
          {expanded ? "Hide" : "Show"}
        </button>
      </div>
      {expanded && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <button
              onClick={onOpenPairModal}
              className="col-span-2 px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--glass-bg)] text-left hover:border-[var(--color-primary)] transition"
            >
              {selectedPairLabel || "Select trading pair"}
            </button>
            <label className="flex flex-col gap-1">
              <span className="text-[var(--color-text-secondary)]">Amount</span>
              <input
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                className="bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-sm focus:border-[var(--color-primary)] outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[var(--color-text-secondary)]">
                Range %
              </span>
              <select
                value={priceRangePercent}
                onChange={(e) => setPriceRangePercent(Number(e.target.value))}
                className="bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-sm focus:border-[var(--color-primary)] outline-none"
              >
                {[0, 1, 2, 3, 5, 7, 10, 20, 50].map((p) => (
                  <option key={p} value={p}>
                    {p === 0 ? "Auto" : `${p}%`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-4 text-[10px] items-center">
            <div className="flex items-center gap-1">
              Exchange:
              <button
                onClick={() =>
                  setSelectedExchange(
                    selectedExchange === "binance" ? "bybit" : "binance"
                  )
                }
                className="px-2 py-1 rounded bg-[var(--color-surface-hover)] hover:bg-[var(--color-primary)]/20 transition text-xs"
              >
                {selectedExchange}
              </button>
            </div>
            <div className="flex items-center gap-1">
              Strategy:
              <button
                onClick={() =>
                  setStrategyType(
                    strategyType === "GRID" ? "DELTA_NEUTRAL" : "GRID"
                  )
                }
                className="px-2 py-1 rounded bg-[var(--color-surface-hover)] hover:bg-[var(--color-primary)]/20 transition text-xs"
              >
                {strategyType}
              </button>
            </div>
            <label className="flex items-center gap-1 cursor-pointer select-none">
              Test Mode
              <input
                type="checkbox"
                checked={isTestMode}
                onChange={(e) => setIsTestMode(e.target.checked)}
              />
            </label>
          </div>
          {strategyType === "GRID" ? (
            loadingPreview ? (
              <p className="text-xs text-[var(--color-text-secondary)]">
                Calculating hedge plan…
              </p>
            ) : (
              hedgePlan?.legs && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)] font-medium">
                    Hedge Plan
                  </p>
                  <div className="space-y-4">
                    {hedgePlan.legs.map((leg, i) => (
                      <HedgeLegEditor
                        key={i}
                        leg={leg}
                        legIndex={i}
                        baseMint={leg.tradingPair.replace("USDT", "")}
                        onChange={onHedgePlanChange}
                        onQuantityBlur={onHedgePlanBlur}
                      />
                    ))}
                  </div>
                  {hasZeroQty && (
                    <div className="text-xs text-amber-400">
                      Increase amount: some zone quantities are zero.
                    </div>
                  )}
                </div>
              )
            )
          ) : deltaNeutralWarning ? (
            <div className="text-xs text-amber-400">{deltaNeutralWarning}</div>
          ) : (
            <div className="text-xs text-[var(--color-text-secondary)]">
              Hedge auto-created for both sides.
            </div>
          )}
          <button
            disabled={disabled}
            onClick={onSetup}
            className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)]/80 to-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed shadow hover:shadow-lg transition"
          >
            {disabled
              ? "Processing…"
              : "Setup Liquidity" + (isTestMode ? " (Test)" : "")}
          </button>
        </div>
      )}
    </div>
  );
};
