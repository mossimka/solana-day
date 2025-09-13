"use client";
import React, { useState } from "react";
import type { PositionWithDetails, HedgeLegDetails } from "../types";
import { HedgePlanDialog } from "./HedgePlanDialog";

interface PositionCardProps {
  position: PositionWithDetails;
  onRemove: (p: PositionWithDetails) => void;
  onToggleRebalance: (id: string, enabled: boolean) => void;
}

export const PositionCard: React.FC<PositionCardProps> = ({
  position,
  onRemove,
  onToggleRebalance,
}) => {
  const [openPlan, setOpenPlan] = useState(false);
  const {
    positionId,
    profitability,
    details,
    isAutoRebalancing,
    hedgePlan,
    priceRange,
    rebalanceStatus,
  } = position;
  const hedgePnlNum = details?.hedgePnl ?? 0;
  const initialValueNum = Number(
    details?.initialValue || position.initialValue
  );
  const profitabilityNum = Number(profitability);
  const lpPnlInUsd = (profitabilityNum / 100) * initialValueNum;
  const overallPnl = hedgePnlNum + lpPnlInUsd;
  const isTest = positionId.startsWith("test-");
  const canShowPlan = hedgePlan && hedgePlan.strategyType !== "DELTA_NEUTRAL";

  return (
    <div
      className={`p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--glass-bg)] space-y-3 relative overflow-hidden group`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                details?.isActive ? "bg-emerald-400" : "bg-zinc-500"
              }`}
            />
            <span>{positionId.slice(0, 12)}…</span>
            {isTest && (
              <span className="px-2 py-0.5 text-[10px] rounded bg-amber-500/20 text-amber-300">
                TEST
              </span>
            )}
            {details?.strategyType && (
              <span className="px-2 py-0.5 text-[10px] rounded bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                {details.strategyType.replace("_", " ")}
              </span>
            )}
          </div>
          {priceRange && details?.pairName && (
            <div className="text-xs text-[var(--color-text-secondary)]">
              LP Range {Number(priceRange.lower).toFixed(4)} -{" "}
              {Number(priceRange.upper).toFixed(4)} ({details.pairName})
            </div>
          )}
          {isAutoRebalancing && (
            <div className="text-xs text-[var(--color-text-secondary)]">
              Rebalance:{" "}
              <span className="text-[var(--color-text-primary)]">
                {rebalanceStatus || "idle"}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wide">
            <span className="text-[var(--color-text-secondary)]">Auto</span>
            <input
              type="checkbox"
              checked={!!isAutoRebalancing}
              onChange={(e) => onToggleRebalance(positionId, e.target.checked)}
              aria-label="Toggle auto rebalance"
            />
          </label>
          <div className="flex gap-2">
            {canShowPlan && (
              <button
                onClick={() => setOpenPlan(true)}
                className="px-2 py-1 rounded bg-[var(--color-surface-hover)] hover:bg-[var(--color-primary)]/20 text-xs transition"
              >
                Plan
              </button>
            )}
            <button
              onClick={() => onRemove(position)}
              className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs transition"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-[var(--color-text-secondary)]">
            Overall P&L:
          </span>{" "}
          <span
            className={overallPnl >= 0 ? "text-emerald-400" : "text-red-400"}
          >
            ${overallPnl.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-[var(--color-text-secondary)]">LP P&L:</span>{" "}
          <span
            className={
              profitabilityNum >= 0 ? "text-emerald-400" : "text-red-400"
            }
          >
            {profitabilityNum.toFixed(2)}% (${lpPnlInUsd.toFixed(2)})
          </span>
        </div>
        <div>
          <span className="text-[var(--color-text-secondary)]">LP Size:</span>{" "}
          ~${initialValueNum.toFixed(2)}
        </div>
      </div>
      <div className="space-y-2">
        {details?.legs?.length ? (
          details.legs.map((leg: HedgeLegDetails, i: number) => {
            const pnl = leg.unrealizedPnl + leg.realizedPnl - leg.feesPaid;
            const baseAssetSymbol = leg.tradingPair.replace("USDT", "");
            return (
              <div
                key={i}
                className="rounded-lg border border-[var(--color-border)]/60 p-2 text-[10px] grid grid-cols-2 md:grid-cols-4 gap-2 relative group/leg"
              >
                <div className="col-span-2 md:col-span-4 flex items-center gap-2 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />{" "}
                  {leg.tradingPair}
                </div>
                <div>
                  P&L{" "}
                  <span
                    className={pnl >= 0 ? "text-emerald-400" : "text-red-400"}
                  >
                    ${pnl.toFixed(4)}
                  </span>
                </div>
                <div>
                  Size {leg.hedgePositionSize?.toFixed(3)} {baseAssetSymbol}
                </div>
                <div>Entry ${leg.avgEntryPrice?.toFixed(3)}</div>
                <div>Price ${leg.currentPrice?.toFixed(3)}</div>
              </div>
            );
          })
        ) : (
          <p className="text-[10px] text-[var(--color-text-secondary)]">
            No hedge data.
          </p>
        )}
      </div>
      <div className="text-[10px]">
        <p className="font-medium mb-1">History</p>
        <ul className="max-h-32 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
          {details?.history?.length ? (
            [...details.history].reverse().map((h, i) => (
              <li
                key={i}
                className="leading-tight text-[var(--color-text-secondary)]"
              >
                {h}
              </li>
            ))
          ) : (
            <li className="text-[var(--color-text-secondary)]">
              No actions yet.
            </li>
          )}
        </ul>
      </div>
      {openPlan && hedgePlan && (
        <HedgePlanDialog
          plan={hedgePlan}
          currentZone={details?.legs?.[0]?.currentZone}
          currentHedgeSize={details?.legs?.[0]?.hedgePositionSize}
          onClose={() => setOpenPlan(false)}
        />
      )}
    </div>
  );
};
