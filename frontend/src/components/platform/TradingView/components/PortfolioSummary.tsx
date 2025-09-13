import React from "react";

interface WalletInfo {
  totalValue: number;
  dailyChange: number;
  solBalance: number;
  usdcBalance: number;
}

export default function PortfolioSummary({ walletInfo }: { walletInfo: WalletInfo }) {
  return (
    <div className="glass p-6">
      <h2 className="text-xl font-bold mb-6" style={{color: 'var(--color-text-primary)'}}>Portfolio Summary</h2>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span style={{color: 'var(--color-text-secondary)'}}>Total Value</span>
          <span className="text-2xl font-bold" style={{color: 'var(--color-text-primary)'}}>
            ${walletInfo.totalValue.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span style={{color: 'var(--color-text-secondary)'}}>24h Change</span>
          <span className="text-green-400 font-medium">
            +{walletInfo.dailyChange}%
          </span>
        </div>

        <div className="border-t pt-4 space-y-2" style={{borderColor: 'var(--color-border)'}}>
          <div className="flex justify-between">
            <span style={{color: 'var(--color-text-secondary)'}}>SOL Balance</span>
            <span style={{color: 'var(--color-text-primary)'}}>{walletInfo.solBalance} SOL</span>
          </div>
          <div className="flex justify-between">
            <span style={{color: 'var(--color-text-secondary)'}}>USDC Balance</span>
            <span style={{color: 'var(--color-text-primary)'}}>
              {walletInfo.usdcBalance.toLocaleString()} USDC
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
