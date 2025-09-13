"use client";
import React, { useState } from "react";
import type { FullHedgePlan } from "../types";
import { WalletPanel } from "./WalletPanel";
import { SetupLiquidityPanel } from "./SetupLiquidityPanel";
import { PairSelectorModal } from "./PairSelectorModal";

interface ControlPanelProps {
  activeWallet: string | null;
  balances: any;
  binanceBalance: string;
  bybitBalance: string;
  selectedExchange: string;
  onPrivateKeySave: (key: string) => Promise<void> | void;
  savingKey?: boolean;
  // Liquidity setup
  selectedPoolLabel: string | null;
  inputAmount: string;
  setInputAmount: (v: string) => void;
  priceRangePercent: number;
  setPriceRangePercent: (n: number) => void;
  hedgePlan: FullHedgePlan | null;
  loadingPreview: boolean;
  strategyType: string;
  setStrategyType: (s: any) => void;
  setSelectedExchange: (e: any) => void;
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
  // Pair selection
  onOpenPairModal: () => void;
  onSelectPair: (p: any) => void;
  pairModalOpen: boolean;
  onClosePairModal: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const [tab, setTab] = useState<"wallet" | "setup">("wallet");
  const { pairModalOpen, onClosePairModal, onSelectPair } = props;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setTab("wallet")}
          className={`px-3 py-1.5 rounded-xl border text-xs transition ${
            tab === "wallet"
              ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
              : "bg-[var(--glass-bg)] border-[var(--color-border)] hover:border-[var(--color-primary)]"
          }`}
        >
          Wallet
        </button>
        <button
          onClick={() => setTab("setup")}
          className={`px-3 py-1.5 rounded-xl border text-xs transition ${
            tab === "setup"
              ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
              : "bg-[var(--glass-bg)] border-[var(--color-border)] hover:border-[var(--color-primary)]"
          }`}
        >
          Setup
        </button>
      </div>
      {tab === "wallet" ? (
        <WalletPanel
          activeWallet={props.activeWallet}
          balances={props.balances}
          binanceBalance={props.binanceBalance}
          bybitBalance={props.bybitBalance}
          selectedExchange={props.selectedExchange}
          onPrivateKeySave={props.onPrivateKeySave}
          saving={props.savingKey}
        />
      ) : (
        <SetupLiquidityPanel
          selectedPairLabel={props.selectedPoolLabel}
          onOpenPairModal={props.onOpenPairModal}
          inputAmount={props.inputAmount}
          setInputAmount={props.setInputAmount}
          priceRangePercent={props.priceRangePercent}
          setPriceRangePercent={props.setPriceRangePercent}
          hedgePlan={props.hedgePlan}
          loadingPreview={props.loadingPreview}
          strategyType={props.strategyType}
          setStrategyType={props.setStrategyType}
          selectedExchange={props.selectedExchange}
          setSelectedExchange={props.setSelectedExchange}
          onHedgePlanChange={props.onHedgePlanChange}
          onHedgePlanBlur={props.onHedgePlanBlur}
          onSetup={props.onSetup}
          disabled={props.disabled}
          isTestMode={props.isTestMode}
          setIsTestMode={props.setIsTestMode}
          deltaNeutralWarning={props.deltaNeutralWarning}
        />
      )}
      <PairSelectorModal
        isOpen={pairModalOpen}
        onClose={onClosePairModal}
        onSelect={onSelectPair}
      />
    </div>
  );
};
