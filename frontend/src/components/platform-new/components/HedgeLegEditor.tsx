"use client";
import React from "react";
import type { HedgeLegPlan, HedgeZone } from "../types";

interface HedgeLegEditorProps {
  leg: HedgeLegPlan;
  legIndex: number;
  baseMint: string;
  onChange: (
    legIndex: number,
    field: string,
    value: string,
    zoneIndex?: number
  ) => void;
  onQuantityBlur?: (
    legIndex: number,
    field: string,
    value: string,
    zoneIndex?: number
  ) => void;
}

export const HedgeLegEditor: React.FC<HedgeLegEditorProps> = ({
  leg,
  legIndex,
  baseMint,
  onChange,
  onQuantityBlur,
}) => {
  const totalQty = leg.zones.reduce((s, z) => s + Number(z.quantity), 0) || 0;
  return (
    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--glass-bg)] space-y-3">
      <h4 className="font-semibold text-sm tracking-wide flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-primary)]" />{" "}
        {leg.tradingPair} Hedge
      </h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-[var(--color-text-secondary)]">Leverage</span>
          <input
            type="number"
            value={leg.leverage}
            onChange={(e) => onChange(legIndex, "leverage", e.target.value)}
            className="bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-sm focus:border-[var(--color-primary)] outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[var(--color-text-secondary)]">Base Hedge</span>
          <input
            type="number"
            value={leg.baseHedgeAmount}
            onChange={(e) =>
              onChange(legIndex, "baseHedgeAmount", e.target.value)
            }
            onBlur={(e) =>
              onQuantityBlur?.(legIndex, "baseHedgeAmount", e.target.value)
            }
            className="bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-sm focus:border-[var(--color-primary)] outline-none"
          />
          {baseMint === "SOL" && (
            <span className="text-[10px] text-[var(--color-text-secondary)]">
              Amount must be integer.
            </span>
          )}
        </label>
      </div>
      <div className="rounded-lg overflow-hidden border border-[var(--color-border)]">
        <div className="grid grid-cols-4 gap-2 text-[11px] px-2 py-1 bg-[var(--color-surface-hover)]/40 font-medium tracking-wide">
          <span>Zone</span>
          <span>Entry ($)</span>
          <span>Qty</span>
          <span>%</span>
        </div>
        {leg.zones.map((z: HedgeZone, zi) => {
          const pct = totalQty > 0 ? (Number(z.quantity) / totalQty) * 100 : 0;
          return (
            <div
              key={z.zone}
              className="grid grid-cols-4 gap-2 items-center px-2 py-1 text-[11px] border-t border-[var(--color-border)]/50"
            >
              <span>{z.zone}</span>
              <input
                type="number"
                value={z.entryPrice}
                onChange={(e) =>
                  onChange(legIndex, "entryPrice", e.target.value, zi)
                }
                className="bg-transparent border border-[var(--color-border)] rounded px-1 py-0.5 focus:border-[var(--color-primary)] outline-none"
              />
              <input
                type="number"
                value={z.quantity}
                onChange={(e) =>
                  onChange(legIndex, "quantity", e.target.value, zi)
                }
                onBlur={(e) =>
                  onQuantityBlur?.(legIndex, "quantity", e.target.value, zi)
                }
                className="bg-transparent border border-[var(--color-border)] rounded px-1 py-0.5 focus:border-[var(--color-primary)] outline-none"
              />
              <input
                type="number"
                value={pct.toFixed(2)}
                onChange={(e) => {
                  const newPct = Number(e.target.value);
                  if (!isNaN(newPct) && newPct >= 0 && newPct < 100) {
                    const P = newPct / 100;
                    const others = leg.zones.reduce(
                      (sum, c, i) =>
                        i !== zi ? sum + Number(c.quantity) : sum,
                      0
                    );
                    const qNew = (P * others) / (1 - P);
                    onChange(legIndex, "quantity", String(qNew), zi);
                  }
                }}
                className="bg-transparent border border-[var(--color-border)] rounded px-1 py-0.5 focus:border-[var(--color-primary)] outline-none"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
