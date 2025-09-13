"use client";
import {
  useLiquidityPlatform,
  ControlPanel,
  PositionsList,
  ChartPanel,
} from "@/components/platform-new";
import React from "react";

export default function PlatformPage() {
  const {
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
    message,
    isSettingUp,
    isTestMode,
    setIsTestMode,
    priceRangePercent,
    setPriceRangePercent,
    inputAmount,
    setInputAmount,
    selectPool,
    toggleRebalance,
    removePosition,
    setupPosition,
    setHedgePlan,
    deltaNeutralWarning,
    openPairModal,
    closePairModal,
    pairModalOpen,
    savePrivateKey,
    savingKey,
  } = useLiquidityPlatform();

  // Local hedge plan editing handlers (mutate plan held in hook's state)
  const handleHedgePlanChange = (
    legIndex: number,
    field: string,
    value: string,
    zoneIndex?: number
  ) => {
    if (!hedgePlan) return;
    const draft = structuredClone(hedgePlan);
    if (zoneIndex !== undefined) {
      (draft.legs[legIndex].zones[zoneIndex] as unknown as Record<string, unknown>)[field] = value;
    } else {
      (draft.legs[legIndex] as unknown as Record<string, unknown>)[field] = value;
    }
    setHedgePlan(draft);
  };
  const handleHedgePlanBlur = (
    legIndex: number,
    field: string,
    value: string
  ) => {
    // Example: round SOL baseHedgeAmount
    if (!hedgePlan) return;
    const draft = structuredClone(hedgePlan);
    if (
      field === "baseHedgeAmount" &&
      draft.legs[legIndex].tradingPair.startsWith("SOL")
    ) {
      const v = Math.round(Number(value));
      draft.legs[legIndex].baseHedgeAmount = v;
      setHedgePlan(draft);
    }
  };

  return (
    <main className="px-4 md:px-8 py-28 space-y-10 max-w-7xl mx-auto">
      <section className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold tracking-wide">Chart</h2>
            <ChartPanel 
              poolId={selectedPool?.poolId} 
              symbol={selectedPool ? `${selectedPool.baseMint}/${selectedPool.quoteMint}` : undefined}
              isWalletConnected={!!activeWallet}
            />
          </div>
          <div className="space-y-4">
            <h2 className="text-sm font-semibold tracking-wide">Positions</h2>
            {message && (
              <div className="text-xs px-3 py-2 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)]/80">
                {message}
              </div>
            )}
            <PositionsList
              positions={positions}
              loading={loadingPositions}
              onRemove={removePosition}
              onToggleRebalance={toggleRebalance}
            />
          </div>
        </div>
        <aside className="space-y-8">
          <ControlPanel
            activeWallet={activeWallet}
            balances={balances}
            binanceBalance={binanceBalance}
            bybitBalance={bybitBalance}
            selectedExchange={selectedExchange}
            onPrivateKeySave={savePrivateKey}
            savingKey={savingKey}
            selectedPoolLabel={
              selectedPool
                ? `${selectedPool.baseMint}/${selectedPool.quoteMint}`
                : null
            }
            inputAmount={inputAmount}
            setInputAmount={setInputAmount}
            priceRangePercent={priceRangePercent}
            setPriceRangePercent={setPriceRangePercent}
            hedgePlan={hedgePlan}
            loadingPreview={loadingPreview}
            strategyType={strategyType}
            setStrategyType={setStrategyType}
            setSelectedExchange={setSelectedExchange}
            onHedgePlanChange={handleHedgePlanChange}
            onHedgePlanBlur={handleHedgePlanBlur}
            onSetup={setupPosition}
            disabled={isSettingUp}
            isTestMode={isTestMode}
            setIsTestMode={setIsTestMode}
            deltaNeutralWarning={deltaNeutralWarning}
            onOpenPairModal={openPairModal}
            onSelectPair={selectPool}
            pairModalOpen={pairModalOpen}
            onClosePairModal={closePairModal}
          />
        </aside>
      </section>
    </main>
  );
}