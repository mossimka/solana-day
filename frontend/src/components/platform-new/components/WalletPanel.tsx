"use client";
import React from "react";
import type { BalanceResponse } from "../types";

interface WalletPanelProps {
  activeWallet: string | null;
  balances: BalanceResponse;
  binanceBalance: string;
  bybitBalance: string;
  selectedExchange: string;
  onPrivateKeySave: (key: string) => Promise<void> | void;
  saving?: boolean;
}

export const WalletPanel: React.FC<WalletPanelProps> = ({
  activeWallet,
  balances,
  binanceBalance,
  bybitBalance,
  selectedExchange,
  onPrivateKeySave,
  saving,
}) => {
  const [pk, setPk] = React.useState("");
  const truncate = (a: string) => (a ? a.slice(0, 6) + "…" + a.slice(-6) : "");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide">Wallet</h3>
        {activeWallet && (
          <span className="text-[10px] px-2 py-1 rounded bg-[var(--color-surface-hover)]">
            {truncate(activeWallet)}
          </span>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onPrivateKeySave(pk);
        }}
        className="space-y-2"
      >
        <input
          type="password"
          value={pk}
          onChange={(e) => setPk(e.target.value)}
          placeholder="Private key (bs58)"
          className="w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
          required
        />
        <button
          type="submit"
          disabled={!pk || saving}
          className="w-full px-3 py-2 rounded bg-[var(--color-primary)]/80 hover:bg-[var(--color-primary)] text-white text-sm font-medium transition disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save Key"}
        </button>
      </form>
      <div className="grid grid-cols-2 gap-3 text-xs">
        {Object.entries(balances).map(([token, data]) => (
          <div
            key={token}
            className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--glass-bg)]/60 hover:border-[var(--color-primary)] transition flex flex-col gap-0.5"
          >
            <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)]">
              {token}
            </span>
            <span className="font-medium">
              {Number(data.amount).toFixed(4)}
            </span>
            <span className="text-[var(--color-text-secondary)]">
              ~${Number(data.valueInUSD).toFixed(2)}
            </span>
          </div>
        ))}
        <div className="col-span-2 p-2 rounded-lg border border-[var(--color-border)] bg-[var(--glass-bg)]/60 flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-secondary)]">
            {selectedExchange === "binance" ? "Binance" : "Bybit"} Futures
          </span>
          <span className="font-medium">
            ${selectedExchange === "binance" ? binanceBalance : bybitBalance}
          </span>
        </div>
      </div>
    </div>
  );
};
