"use client";
import React from "react";
import type { FullHedgePlan } from "../types";

interface HedgePlanDialogProps {
  plan: FullHedgePlan;
  currentZone?: number;
  currentHedgeSize?: number;
  onClose: () => void;
}

export const HedgePlanDialog: React.FC<HedgePlanDialogProps> = ({
  plan,
  currentZone = 0,
  currentHedgeSize = 0,
  onClose,
}) => {
  const leg = plan.legs?.[0];
  if (!leg) return null;
  const margin =
    Number(leg.leverage) > 0
      ? Number(leg.baseHedgeAmount) / Number(leg.leverage)
      : 0;
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Hedge plan details"
      onClick={onClose}
    >
      <div
        className="bg-[var(--glass-bg)] rounded-2xl border border-[var(--color-border)] w-full max-w-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold">
            Hedge Plan ({plan.pairName})
          </h2>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 rounded hover:bg-[var(--color-surface-hover)]"
          >
            ✕
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[var(--color-text-secondary)]">
                Leverage:
              </span>{" "}
              {leg.leverage}x
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">
                Margin:
              </span>{" "}
              ${margin.toFixed(2)}
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">
                Base Hedge:
              </span>{" "}
              {leg.baseHedgeAmount}
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">
                Current Hedge:
              </span>{" "}
              {currentHedgeSize}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-xs">
              <thead className="bg-[var(--color-surface-hover)]/40 text-[var(--color-text-secondary)] uppercase tracking-wide">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Zone</th>
                  <th className="px-2 py-2 text-left font-medium">Price</th>
                  <th className="px-2 py-2 text-left font-medium">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {leg.zones.map((z) => (
                  <tr
                    key={z.zone}
                    className={
                      z.zone === currentZone
                        ? "bg-[var(--color-primary)]/10"
                        : ""
                    }
                  >
                    <td className="px-2 py-1">{z.zone}</td>
                    <td className="px-2 py-1">
                      ${Number(z.entryPrice).toFixed(4)}
                    </td>
                    <td className="px-2 py-1">{z.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
